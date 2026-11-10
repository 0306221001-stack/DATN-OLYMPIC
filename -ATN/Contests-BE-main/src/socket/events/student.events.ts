import { Server, Socket } from "socket.io";
import { z } from "zod";
import { logger } from "@/utils/logger";
import { prisma } from "@/config/database";
import { timerService } from "../services/timer.service";
import { transformQuestionMedia } from "@/utils/mediaTransform";

// Extended Socket interface for type safety
interface AuthenticatedSocket extends Socket {
  user: {
    userId: number;
    username: string;
    email: string;
    role: string;
  };
  contestantId?: number;
  matchId?: number;
}

// Validation schemas

const JoinMatchSchema = z.object({
  matchId: z.number().int().positive(),
});

const SubmitAnswerSchema = z.object({
  matchId: z.number().int().positive(),
  questionOrder: z.number().int().positive(),
  answer: z.string().min(1).max(500),
  submittedAt: z.string().datetime().optional(),
});

const GetQuestionSchema = z.object({
  matchId: z.number().int().positive(),
  questionOrder: z.number().int().positive(),
});

// Match control schemas (for admin commands)
const StartMatchSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)]),
});

const NextQuestionSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)]),
});

const TimerControlSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)]),
});

const EndMatchSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)]),
});

// Helper function to resolve match from either ID or slug
const resolveMatch = async (matchIdentifier: number | string) => {
  if (typeof matchIdentifier === "number") {
    return await prisma.match.findUnique({
      where: { id: matchIdentifier },
      include: {
        round: {
          include: {
            contest: {
              select: { name: true, status: true },
            },
          },
        },
        questionPackage: {
          select: { name: true },
        },
      },
    });
  } else {
    return await prisma.match.findFirst({
      where: { slug: matchIdentifier },
      include: {
        round: {
          include: {
            contest: {
              select: { name: true, status: true },
            },
          },
        },
        questionPackage: {
          select: { name: true },
        },
      },
    });
  }
};

export const registerStudentEvents = (
  namespace: any,
  socket: AuthenticatedSocket
) => {
  // Only allow Student role to access these events
  if (socket.user.role !== "Student") {
    return;
  }

  /**
   * Event: student:getMatchStatus
   * Get current match status and results
   */
  socket.on("student:getMatchStatus", async (callback) => {
    try {
      if (!socket.contestantId || !socket.matchId) {
        return callback?.({
          success: false,
          message: "Not joined to any match. Please join a match first.",
        });
      }

      // 🔥 NEW: Tìm match bằng ID hoặc slug
      const match = await prisma.match.findFirst({
        where: {
          OR: [{ id: socket.matchId }, { slug: socket.matchId.toString() }],
        },
        include: {
          round: {
            include: {
              contest: true,
            },
          },
        },
      });

      if (!match) {
        return callback?.({ success: false, message: "Match not found" });
      }

      // Get student's results
      const results = await prisma.result.findMany({
        where: {
          contestantId: socket.contestantId,
          matchId: socket.matchId,
        },
        select: {
          questionOrder: true,
          isCorrect: true,
          createdAt: true,
        },
        orderBy: {
          questionOrder: "asc",
        },
      });

      // 🔥 NEW: Lấy trạng thái thí sinh từ contestantMatch
      const contestantMatch = await prisma.contestantMatch.findUnique({
        where: {
          contestantId_matchId: {
            contestantId: socket.contestantId,
            matchId: match.id,
          },
        },
        select: {
          status: true,
        },
      });

      callback?.({
        success: true,
        message: "Match status retrieved successfully",
        data: {
          matchData: {
            matchId: match.id,
            matchName: match.name,
            contestName: match.round.contest.name,
            currentQuestion: match.currentQuestion,
            remainingTime: match.remainingTime,
            status: match.status,
          },
          contestantStatus: contestantMatch?.status || "not_started",
          results: results.map((result: any) => ({
            questionOrder: result.questionOrder,
            isCorrect: result.isCorrect,
            submittedAt: result.createdAt.toISOString(),
          })),
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error(`❌ Error in student getMatchStatus: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to get match status" });
    }
  });

  /**
   * Event: student:getQuestion
   * Get specific question data
   */
  socket.on("student:getQuestion", async (data, callback) => {
    try {
      const validatedData = GetQuestionSchema.parse(data);
      const { matchId, questionOrder } = validatedData;

      // Verify the student is in this match
      if (socket.matchId !== matchId) {
        return callback?.({
          success: false,
          message: "Not authorized for this match",
        });
      }

      // Get the question using questionDetail
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: {
          questionPackageId: true,
        },
      });

      if (!match) {
        return callback?.({ success: false, message: "Match not found" });
      }

      // Get question through questionDetail
      const questionDetail = await prisma.questionDetail.findFirst({
        where: {
          questionPackageId: match.questionPackageId,
          questionOrder: questionOrder,
          isActive: true,
        },
        include: {
          question: {
            select: {
              id: true,
              content: true,
              options: true,
              intro: true,
              questionType: true,
              questionMedia: true,
              defaultTime: true,
              score: true,
            },
          },
        },
      });

      if (!questionDetail) {
        return callback?.({ success: false, message: "Question not found" });
      }

      const question = questionDetail.question;
      let choices: any[] = [];

      // Prisma trả cột JSON đã được parse (mảng); chỉ parse lại khi là chuỗi
      if (Array.isArray(question.options)) {
        choices = question.options;
      } else if (typeof question.options === "string") {
        try {
          const parsed = JSON.parse(question.options);
          choices = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          choices = [];
        }
      }

      callback?.({
        success: true,
        message: "Question retrieved successfully",
        data: {
          id: question.id,
          order: questionDetail.questionOrder,
          text: question.content,
          // Thí sinh vào giữa chừng cần biết loại câu để dựng câu tự luận
          // (không có phương án) và cần media để hiện câu hỏi hình ảnh/video.
          intro: question.intro,
          questionType: question.questionType,
          defaultTime: question.defaultTime,
          score: question.score,
          media: transformQuestionMedia(question.questionMedia),
          choices: choices.map((choice: any, index: number) => ({
            id: index,
            text: choice.text || choice,
            isCorrect: false, // Don't expose correct answer to students
          })),
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error(`❌ Error in student getQuestion: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to get question" });
    }
  });

  /**
   * Event: joinMatchRoom
   * Legacy event for joining match rooms
   */
  socket.on(
    "joinMatchRoom",
    async (matchId: number, callback?: (response: any) => void) => {
      try {
        const roomName = `match-${matchId}`;
        await socket.join(roomName);
        socket.matchId = matchId;

        callback?.({
          success: true,
          message: `Joined match room: ${roomName}`,
          roomName: roomName,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        logger.error(`❌ Error in joinMatchRoom: ${errorMessage}`);
        callback?.({ success: false, message: "Failed to join room" });
      }
    }
  );

  /**
   * Event: leaveMatchRoom
   * Leave a match room
   */
  socket.on("leaveMatchRoom", (matchId: number) => {
    const roomName = `match-${matchId}`;
    socket.leave(roomName);

    if (socket.matchId === matchId) {
      socket.matchId = undefined;
    }
    // Lấy và log tổng số client đang kết nối tới namespace
    const connectedClients = namespace.sockets.size;
    const studentInRoom = namespace.sockets.get(socket.user.username);
  });

  /**
   * Event: student:confirmStart
   * Thí sinh xác nhận đã nhận được sự kiện bắt đầu trận đấu.
   */
  socket.on(
    "student:confirmStart",
    async (data: { contestantId: number; matchId: number }) => {
      const { contestantId, matchId } = data;

      if (!contestantId) {
        logger.warn(
          `[student:confirmStart] Socket ${socket.id} (user: ${socket.user.username}) không có contestantId.`
        );
        return;
      }

      try {
        await prisma.contestantMatch.update({
          where: {
            contestantId_matchId: {
              contestantId: contestantId,
              matchId: matchId,
            },
          },
          data: {
            status: "in_progress",
          },
        });
      } catch (error) {
        logger.error(
          `❌ Lỗi khi cập nhật trạng thái cho thí sinh ${contestantId} trong trận đấu ${matchId}:`,
          error
        );
      }
    }
  );
};

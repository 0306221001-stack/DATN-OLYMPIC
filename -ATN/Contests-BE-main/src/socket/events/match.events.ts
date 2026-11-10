import { Server, Socket } from "socket.io";
import { z } from "zod";
import { logger } from "@/utils/logger";
import { MatchService } from "@/modules/match";
import { prisma } from "@/config/database";
import { transformQuestionMedia } from "@/utils/mediaTransform";
import { matchTimers } from "./timer.event";

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

// Helper function to resolve match from either ID or slug
const resolveMatch = async (matchIdentifier: number | string) => {
  if (typeof matchIdentifier === "number") {
    // matchIdentifier is a number (matchId)
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
    // matchIdentifier is a string (slug)
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

// Validation schemas - now support both number and string
const StartMatchSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)]),
});

const ShowQuestionSchema = z.object({
  match: z.string().min(1),
});

const EndMatchSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)]),
});

const GetMatchStatusSchema = z.object({
  matchId: z.union([z.number().int().positive(), z.string().min(1)]),
});

export const registerMatchEvents = (
  io: Server,
  socket: AuthenticatedSocket
) => {
  // Only allow Admin and Judge roles to control matches
  if (!["Admin", "Judge"].includes(socket.user.role)) {
    return;
  }

  /**
   * Event: match:start
   * Start a match and notify all participants
   */
  socket.on("match:start", async (data, callback) => {
    try {
      const validatedData = StartMatchSchema.parse(data);
      const { matchId: matchIdentifier } = validatedData;

      console.log("🔍 [DEBUG] match:start received:", {
        matchIdentifier,
        type: typeof matchIdentifier,
      });

      // Get match information using helper function
      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        logger.warn(`❌ ${error}: ${matchIdentifier}`);
        return callback?.({ success: false, message: error });
      }

      // Trận chưa xếp thí sinh (chưa chia nhóm) thì không thi được: câu hỏi
      // vẫn chiếu nhưng mọi bài nộp đều bị từ chối.
      const contestantCount = await prisma.contestantMatch.count({
        where: { matchId: match.id },
      });
      if (contestantCount === 0) {
        return callback?.({
          success: false,
          message:
            "Trận chưa có thí sinh nào. Vào Trận đấu → biểu tượng thí sinh → Chia nhóm trước khi bắt đầu.",
        });
      }

      // Update match status to active
      const updatedMatch = await prisma.match.update({
        where: { id: match.id },
        data: {
          status: "ongoing",
          currentQuestion: 1,
          remainingTime: 0,
        },
      });

      const roomName = `match-${match.id}`;

      // Debug: Check who is in the room
      const studentsInRoom = io.of("/student").adapter.rooms.get(roomName);
      const adminInRoom = io.of("/match-control").adapter.rooms.get(roomName);


      // Broadcast to all clients in the match room
      io.of("/match-control").to(roomName).emit("match:started", {
        matchId: match.id,
        matchSlug: match.slug,
        matchName: match.name,
        contestName: match.round.contest.name,
        status: "ongoing",
        startedBy: socket.user.username,
        startedAt: new Date().toISOString(),
      });

      // Also broadcast to students namespace - CHỈ thông báo match bắt đầu, KHÔNG có câu hỏi
      io.of("/student").to(roomName).emit("match:started", {
        matchId: match.id,
        matchSlug: match.slug,
        matchName: match.name,
        contestName: match.round.contest.name,
        status: "ongoing",
        startedBy: socket.user.username,
        startedAt: new Date().toISOString(),
        // 🔥 REMOVED: currentQuestion, remainingTime, currentQuestionData
        // Học sinh sẽ chỉ nhận câu hỏi khi admin nhấn "Hiển thị câu hỏi"
      });

      io.of("/student").emit("match:globalStarted", {
        matchId: match.id,
        matchSlug: match.slug,
        matchName: match.name,
        contestName: match.round.contest.name,
        status: "ongoing",
        startedBy: socket.user.username,
        startedAt: new Date().toISOString(),
        // 🔥 REMOVED: currentQuestion, remainingTime, currentQuestionData
      });


      logger.info(
        `✅ Match started: ${match.id} (${match.slug}) by ${socket.user.username} (${socket.user.role})`
      );

      callback?.({
        success: true,
        message: "Match started successfully",
        data: {
          matchId: match.id,
          matchSlug: match.slug,
          status: "ongoing",
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in match:start: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to start match" });
    }
  });

  /**
   * Event: match:showQuestion
   * 🔥 NEW: Show current question to students WITHOUT incrementing
   * Timer will be controlled separately via timer.event.ts
   */
  socket.on("match:showQuestion", async (data, callback) => {
    try {

      const validatedData = ShowQuestionSchema.parse(data);
      const { match: matchSlug } = validatedData;


      // Get match information using slug
      const match = await resolveMatch(matchSlug);

      if (!match) {
        const error = "Match not found";
        logger.warn(`❌ ${error}: ${matchSlug}`);
        return callback?.({ success: false, message: error });
      }


      // 🔥 FIX: Chỉ hiển thị câu hiện tại, không tăng
      const currentQuestionOrder = match.currentQuestion;

      if (!currentQuestionOrder || currentQuestionOrder <= 0) {
        callback?.({
          success: false,
          message:
            "Chưa có câu hỏi hiện tại. Hãy chuyển sang câu đầu tiên trước.",
        });
        return;
      }


      // Get question details for the current question
      const questionDetail = await prisma.questionDetail.findFirst({
        where: {
          questionPackageId: match.questionPackageId,
          questionOrder: currentQuestionOrder,
          isActive: true,
        },
        include: {
          question: true,
        },
      });

      if (!questionDetail) {
        callback?.({
          success: false,
          message: `Không tìm thấy câu hỏi ${currentQuestionOrder}.`,
        });
        return;
      }

      const questionDetailWithRelation = questionDetail as any;



      const roomName = `match-${match.id}`;



      // Chuẩn bị data câu hỏi với options
      const questionData = {
        id: questionDetailWithRelation.question.id,
        intro: questionDetailWithRelation.question.intro,
        content: questionDetailWithRelation.question.content,
        questionType: questionDetailWithRelation.question.questionType,
        difficulty: questionDetailWithRelation.question.difficulty,
        defaultTime: questionDetailWithRelation.question.defaultTime,
        score: questionDetailWithRelation.question.score,
        media: transformQuestionMedia(
          questionDetailWithRelation.question.questionMedia
        ),
        options: Array.isArray(questionDetailWithRelation.question.options)
          ? questionDetailWithRelation.question.options
          : [],
      };

      // Emit to match-control namespace (for admins)
      io.of("/match-control")
        .to(roomName)
        .emit("match:questionShown", {
          matchId: match.id,
          matchSlug: match.slug,
          currentQuestion: currentQuestionOrder,
          remainingTime: questionDetailWithRelation.question.defaultTime,
          currentQuestionData: {
            order: currentQuestionOrder,
            question: questionData,
          },
        });

      // Emit to student namespace (for students)
      const studentNamespace = io.of("/student");
      const studentsInRoom = studentNamespace.adapter.rooms.get(roomName);


      io.of("/student")
        .to(roomName)
        .emit("match:questionShown", {
          matchId: match.id,
          matchSlug: match.slug,
          currentQuestion: currentQuestionOrder,
          remainingTime: questionDetailWithRelation.question.defaultTime,
          currentQuestionData: {
            order: currentQuestionOrder,
            question: questionData,
          },
        });


      logger.info(
        `✅ Question shown: Match ${match.id} (${match.slug}) | Question ${currentQuestionOrder} | By ${socket.user.username}`
      );

      callback?.({
        success: true,
        message: `Đã hiển thị câu hỏi số ${currentQuestionOrder}`,
        data: {
          matchId: match.id,
          matchSlug: match.slug,
          currentQuestion: currentQuestionOrder,
          remainingTime: questionDetailWithRelation.question.defaultTime,
          totalQuestions: await prisma.questionDetail.count({
            where: { questionPackageId: match.questionPackageId },
          }),
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in match:showQuestion: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to show question" });
    }
  });

  /**
   * Event: match:end
   * End the match and calculate results
   */
  socket.on("match:end", async (data, callback) => {
    try {
      const validatedData = EndMatchSchema.parse(data);
      const { matchId: matchIdentifier } = validatedData;


      // Get match information using helper function
      const match = await resolveMatch(matchIdentifier);

      if (!match) {
        const error = "Match not found";
        logger.warn(`❌ ${error}: ${matchIdentifier}`);
        return callback?.({ success: false, message: error });
      }

      // Update match status to completed
      const updatedMatch = await prisma.match.update({
        where: { id: match.id },
        data: {
          status: "finished",
          remainingTime: 0,
        },
      });

      // Get match results summary
      const results = await prisma.result.findMany({
        where: { matchId: match.id },
        include: {
          contestant: {
            include: {
              student: {
                select: { fullName: true, studentCode: true },
              },
            },
          },
        },
        orderBy: [{ isCorrect: "desc" }, { createdAt: "asc" }],
      });

      // Calculate summary statistics
      const totalQuestions = await prisma.questionDetail.count({
        where: {
          questionPackageId: updatedMatch.questionPackageId,
        },
      });

      const contestantStats = results.reduce((acc, result) => {
        const contestantId = result.contestantId;
        if (!acc[contestantId]) {
          acc[contestantId] = {
            contestantId: contestantId,
            studentName: result.contestant.student?.fullName,
            studentCode: result.contestant.student?.studentCode,
            totalAnswers: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
          };
        }
        acc[contestantId].totalAnswers++;
        if (result.isCorrect) {
          acc[contestantId].correctAnswers++;
        } else {
          acc[contestantId].incorrectAnswers++;
        }
        return acc;
      }, {} as any);

      // Dừng đồng hồ đang chạy để thí sinh không nhận thêm nhịp đếm sau khi
      // trận đã kết thúc.
      const matchTimer = match.slug ? matchTimers.get(match.slug) : undefined;
      if (matchTimer?.intervalId) {
        clearInterval(matchTimer.intervalId);
        matchTimer.intervalId = null;
        matchTimer.status = "paused";
      }

      // Thí sinh ở cả room theo id lẫn theo slug: phát một lần cho cả hai để
      // Socket.IO loại trùng.
      const roomName = match.slug
        ? [`match-${match.id}`, `match-${match.slug}`]
        : `match-${match.id}`;

      // Broadcast match end to all clients
      io.of("/match-control")
        .to(roomName)
        .emit("match:ended", {
          matchId: match.id,
          matchSlug: match.slug,
          status: "finished",
          endedBy: socket.user.username,
          endedAt: new Date().toISOString(),
          summary: {
            totalQuestions: totalQuestions,
            totalContestants: Object.keys(contestantStats).length,
            contestantStats: Object.values(contestantStats),
          },
        });

      // Also broadcast to students
      io.of("/student")
        .to(roomName)
        .emit("match:ended", {
          matchId: match.id,
          matchSlug: match.slug,
          status: "finished",
          endedBy: socket.user.username,
          endedAt: new Date().toISOString(),
          summary: {
            totalQuestions: totalQuestions,
            totalContestants: Object.keys(contestantStats).length,
            contestantStats: Object.values(contestantStats),
          },
        });

      logger.info(
        `✅ Match ended: ${match.id} (${match.slug}) by ${socket.user.username} (${socket.user.role})`
      );

      callback?.({
        success: true,
        message: "Match ended successfully",
        data: {
          matchId: match.id,
          matchSlug: match.slug,
          status: "finished",
          summary: {
            totalQuestions: totalQuestions,
            totalContestants: Object.keys(contestantStats).length,
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in match:end: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to end match" });
    }
  });

  /**
   * Event: match:getStatus
   * Get current match status and statistics
   */
  socket.on("match:getStatus", async (data, callback) => {
    try {
      const validatedData = GetMatchStatusSchema.parse(data);
      const match = await resolveMatch(validatedData.matchId);

      if (!match) {
        return callback?.({ success: false, message: "Match not found" });
      }

      // Type assertion cho match object
      const matchWithRelations = match as any;

      const totalQuestions = await prisma.questionDetail.count({
        where: { questionPackageId: match.questionPackageId },
      });

      // Get current question detail if match has started
      const currentQuestionDetail =
        match.currentQuestion > 0
          ? await prisma.questionDetail.findFirst({
              where: {
                questionPackageId: match.questionPackageId,
                questionOrder: match.currentQuestion,
                isActive: true,
              },
              include: {
                question: true,
              },
            })
          : null;

      // Type assertion để TypeScript hiểu include relationship
      const questionDetailWithRelation = currentQuestionDetail as any;

      const currentQuestionData = questionDetailWithRelation
        ? {
            order: match.currentQuestion,
            question: {
              id: questionDetailWithRelation.question.id,
              intro: questionDetailWithRelation.question.intro,
              content: questionDetailWithRelation.question.content,
              questionType: questionDetailWithRelation.question.questionType,
              difficulty: questionDetailWithRelation.question.difficulty,
              defaultTime: questionDetailWithRelation.question.defaultTime,
              score: questionDetailWithRelation.question.score,
              media: transformQuestionMedia(
                questionDetailWithRelation.question.questionMedia
              ),
              options: Array.isArray(
                questionDetailWithRelation.question.options
              )
                ? questionDetailWithRelation.question.options
                : [],
            },
          }
        : null;

      callback?.({
        success: true,
        data: {
          match: {
            id: match.id,
            name: match.name,
            status: match.status,
            currentQuestion: match.currentQuestion,
            remainingTime: match.remainingTime,
            contestName: matchWithRelations.round.contest.name,
            questionPackageName: matchWithRelations.questionPackage.name,
          },
          currentQuestion: currentQuestionData,
          statistics: {
            totalQuestions,
            connectedStudents: 0,
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error in match:getStatus: ${errorMessage}`);
      callback?.({ success: false, message: "Failed to get match status" });
    }
  });
};

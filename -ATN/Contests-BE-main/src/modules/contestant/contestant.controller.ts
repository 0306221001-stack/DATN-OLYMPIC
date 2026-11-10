import { Request, Response } from "express";
import {
  ContestantService,
  ContestantQueryInput,
  CreateContestantInput,
  UpdateContestantInput,
  CreatesContestInput,
} from "@/modules/contestant";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";
import { ContestantStatus } from "@prisma/client";
import { socketService } from "@/socket/SocketService";
import MatchService from "@/modules/match/match.service";
import { notifyStudentsRescued } from "@/socket/services/studentRescued";
import {
  ADVANCEABLE_STATUSES,
  getAdvanceGuard,
  getIneligibleAdvanceMessage,
} from "@/modules/contestant/advanceGuard";
export default class ContestantController {
  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const contest = await prisma.contest.findFirst({ where: { slug: slug } });
      if (!contest) throw new Error("Không tìm thấy cuộc thi");

      const statusQuery = req.query.status as string;

      const query: ContestantQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        studentId: parseInt(req.query.studentId as string) || undefined,
        roundId: parseInt(req.query.roundId as string) || undefined,
        schoolId: parseInt(req.query.schoolId as string) || undefined,
        classId: parseInt(req.query.classId as string) || undefined,
        groupId: parseInt(req.query.groupId as string) || undefined,
        matchId: parseInt(req.query.matchId as string) || undefined, // Thêm matchId
        status: Object.values(ContestantStatus).includes(
          statusQuery as ContestantStatus
        )
          ? (statusQuery as ContestantStatus)
          : undefined,
        schoolIds: req.query.schoolIds
          ? Array.isArray(req.query.schoolIds)
            ? req.query.schoolIds
                .flatMap(val =>
                  typeof val === "string" ? val.split(",") : val
                )
                .map(Number)
            : typeof req.query.schoolIds === "string"
            ? req.query.schoolIds.split(",").map(Number)
            : undefined
          : undefined,
        classIds: req.query.classIds
          ? Array.isArray(req.query.classIds)
            ? req.query.classIds
                .flatMap(val =>
                  typeof val === "string" ? val.split(",") : val
                )
                .map(Number)
            : typeof req.query.classIds === "string"
            ? req.query.classIds.split(",").map(Number)
            : undefined
          : undefined,
      };

      const data = await ContestantService.getAll(query, contest.id);
      if (!data) {
        throw new Error("Không tìm thấy trận đấu");
      }
      logger.info(`Lấy danh sách thí sinh thành công`);
      res.json(
        successResponse(
          { Contestantes: data.contestantes, pagination: data.pagination },
          "Lấy danh sách thí sinh  thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const input: Omit<CreateContestantInput, "contestId"> = req.body;
      const contest = await prisma.contest.findFirst({
        where: { slug: req.params.slug },
      });
      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }

      const extingcontestants = await prisma.contestant.findFirst({
        where: { studentId: input.studentId },
      });
      if (extingcontestants) {
        throw new Error("Sinh viên đã tham gia cuộc thi");
      }

      const conflictContestant = await prisma.contestant.findFirst({
        where: {
          studentId: input.studentId,
          contest: {
            NOT: { id: contest.id },
            AND: [
              {
                startTime: { lte: contest.startTime },
                endTime: { gte: contest.endTime },
              },
            ],
          },
        },
        include: {
          contest: true,
        },
      });

      if (conflictContestant)
        throw new Error(
          `Sinh viên này đã tham gia cuộc thi ${conflictContestant.contest.name} có cùng thời gian `
        );

      const round = await prisma.round.findFirst({
        where: { id: input.roundId },
      });
      if (!round) throw Error("Không tìm thấy vòng đấu");

      const Contestant = await ContestantService.create({
        ...input,
        contestId: contest.id,
      });

      if (!Contestant) {
        throw new Error(`Thêm thí sinh thất bại`);
      }
      logger.info(`Thêm thí sinh thành công`);
      res.json(successResponse(Contestant, `Thêm thí sinh thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const contestant = await ContestantService.getContestantBy({
        id: Number(id),
      });
      if (!contestant) {
        throw new Error("Không tìm thấy trận đấu");
      }
      logger.info(
        `Lấy thông tin thí sinh ${contestant.student.fullName} thành công`
      );
      res.json(
        successResponse(
          contestant,
          `Lấy thông tin thí sinh ${contestant.student.fullName} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const Contestant = await ContestantService.getContestantBy({
        id: Number(id),
      });
      if (!Contestant) {
        throw new Error("Không tìm thấy thí sinh ");
      }
      const { fullName } = Contestant.student;

      // Kết quả và lượt tham gia trận được xóa cùng, giải thưởng được bỏ gán
      // (xem ContestantService.deleteContestant).
      const deleteContestant = await ContestantService.deleteContestant(
        Contestant.id
      );
      if (!deleteContestant) {
        throw new Error(`Xóa thí sinh "${fullName}" thất bại`);
      }
      logger.info(`Xóa thí sinh "${fullName}" thành công`);
      res.json(successResponse(null, `Xóa thí sinh "${fullName}" thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const input: UpdateContestantInput = req.body;

      const contestant = await ContestantService.getContestantBy({
        id: Number(id),
      });

      if (!contestant) throw new Error("Không tìm thấy thí sinh");

      const round = await prisma.round.findFirst({
        where: { id: input.roundId },
      });
      if (!round) throw Error("Không tìm thấy vòng đấu");
      const updateContestant = await ContestantService.update(
        Number(id),
        input
      );
      if (!updateContestant) {
        throw new Error("Cập nhật vòng thi thất bại");
      }
      logger.info(
        `Cập nhật vòng thi  ${contestant.student.fullName} thành công`
      );
      res.json(
        successResponse(
          updateContestant,
          `Cập nhật vòng thi ${contestant.student.fullName} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async deletes(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        throw new Error("Danh sách ID không hợp lệ");
      }

      const messages: { status: "success" | "error"; msg: string }[] = [];

      for (const id of ids) {
        const Contestant = await ContestantService.getContestantBy({
          id: Number(id),
        });

        if (!Contestant) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy thí sinh với ID = ${id}`,
          });
          continue;
        }

        const { fullName } = Contestant.student;

        try {
          await ContestantService.deleteContestant(Contestant.id);
        } catch (error) {
          logger.error(
            `Xóa thí sinh "${fullName}" thất bại: ${(error as Error).message}`
          );
          messages.push({
            status: "error",
            msg: `Xóa thí sinh "${fullName}" thất bại`,
          });
          continue;
        }

        messages.push({
          status: "success",
          msg: `Xóa thí sinh "${fullName}" thành công`,
        });
        logger.info(`Xóa thí sinh "${fullName}" thành công`);
      }

      res.json({ success: true, messages });
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getAllNotConstest(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const contest = await prisma.contest.findFirst({ where: { slug: slug } });
      const statusQuery = req.query.status as string;

      if (!contest) throw new Error("Không tìm thấy cuộc thi");
      const query: ContestantQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        contestId: parseInt(req.query.contestId as string) || undefined,
        roundId: parseInt(req.query.roundId as string) || undefined,
        status: Object.values(ContestantStatus).includes(
          statusQuery as ContestantStatus
        )
          ? (statusQuery as ContestantStatus)
          : undefined,
      };

      const data = await ContestantService.getAllNotConstest(query, contest.id);
      if (!data) {
        throw new Error("Không tìm thấy trận đấu");
      }
      logger.info(`Lấy danh sách thí sinh thành công`);
      res.json(
        successResponse(
          { Contestantes: data.contestantes, pagination: data.pagination },
          "Lấy danh sách thí sinh  thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async creates(req: Request, res: Response): Promise<void> {
    try {
      const input: CreatesContestInput = req.body;

      const contest = await prisma.contest.findFirst({
        where: { slug: req.params.slug },
      });

      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }

      const round = await prisma.round.findFirst({
        where: { id: input.roundId },
      });
      if (!round) {
        throw new Error("Không tìm thấy vòng đấu");
      }

      const messages: {
        status: "success" | "error";
        studentId?: number;
        msg: string;
      }[] = [];

      let successCount = 0;
      let errorCount = 0;

      for (const id of input.ids) {
        try {
          const student = await prisma.student.findFirst({ where: { id } });
          if (!student) {
            messages.push({
              status: "error",
              msg: `Không tìm thấy thí sinh với ID = ${id}`,
            });
            errorCount++;
            continue;
          }

          const existing = await prisma.contestant.findFirst({
            where: { studentId: id, contestId: contest.id },
          });
          if (existing) {
            messages.push({
              status: "error",
              studentId: id,
              msg: "Sinh viên đã tham gia cuộc thi này",
            });
            errorCount++;
            continue;
          }

          const conflict = await prisma.contestant.findFirst({
            where: {
              studentId: id,
              contest: {
                NOT: { id: contest.id },
                AND: [
                  { startTime: { lte: contest.endTime } },
                  { endTime: { gte: contest.startTime } },
                ],
              },
            },
            include: { contest: true },
          });

          if (conflict) {
            messages.push({
              status: "error",
              studentId: id,
              msg: `Đã tham gia cuộc thi '${conflict.contest.name}' trùng thời gian`,
            });
            errorCount++;
            continue;
          }

          const created = await ContestantService.create({
            roundId: round.id,
            studentId: id,
            contestId: contest.id,
          });

          if (created) {
            successCount++;
          } else {
            messages.push({
              status: "error",
              studentId: id,
              msg: "Thêm thí sinh thất bại",
            });
            errorCount++;
          }
        } catch (err) {
          messages.push({
            status: "error",
            studentId: id,
            msg: `Lỗi hệ thống: ${(err as Error).message}`,
          });
          errorCount++;
        }
      }

      logger.info(
        `Thêm thí sinh: ${successCount} thành công, ${errorCount} thất bại`
      );

      res.json(
        successResponse(
          {
            successCount,
            errorCount,
            messages, // có thể xóa dòng này nếu không muốn gửi về
          },
          ` Thêm danh sách thí sinh thành công `
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getByIdAndMatch(req: Request, res: Response): Promise<void> {
    try {
      const contestantId = Number(req.params.id);
      const matchId = Number(req.params.matchId);

      if (!contestantId || !matchId) {
        throw new Error("ID thí sinh và ID trận đấu không hợp lệ");
      }

      const contestant = await ContestantService.getContestantByIdAndMatch(
        contestantId,
        matchId
      );

      if (!contestant) {
        throw new Error("Không tìm thấy thí sinh trong trận đấu này");
      }

      // Transform data to include group info properly
      const responseData = {
        id: contestant.id,
        roundId: contestant.roundId,
        studentId: contestant.studentId,
        status: contestant.status,
        student: contestant.student,
        round: contestant.round,
        contest: contestant.contest,
        group: contestant.contestantMatches?.[0]?.group || null,
      };

      logger.info(
        `Lấy thông tin thí sinh ${contestant.student.fullName} trong trận đấu thành công`
      );
      res.json(
        successResponse(
          responseData,
          `Lấy thông tin thí sinh ${contestant.student.fullName} trong trận đấu thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getAllWithGroups(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const contest = await prisma.contest.findFirst({ where: { slug: slug } });
      if (!contest) throw new Error("Không tìm thấy cuộc thi");

      const statusQuery = req.query.status as string;

      const query: ContestantQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        studentId: parseInt(req.query.studentId as string) || undefined,
        roundId: parseInt(req.query.roundId as string) || undefined,
        schoolId: parseInt(req.query.schoolId as string) || undefined,
        classId: parseInt(req.query.classId as string) || undefined,
        status: Object.values(ContestantStatus).includes(
          statusQuery as ContestantStatus
        )
          ? (statusQuery as ContestantStatus)
          : undefined,
      };

      // Lấy matchId từ query parameter (optional)
      const matchId = parseInt(req.query.matchId as string) || undefined;

      const data = await ContestantService.getAllWithMatchGroups(
        query,
        contest.id,
        matchId
      );
      if (!data) {
        throw new Error("Không tìm thấy dữ liệu");
      }
      logger.info(`Lấy danh sách thí sinh với thông tin nhóm thành công`);
      res.json(
        successResponse(
          { Contestantes: data.contestantes, pagination: data.pagination },
          "Lấy danh sách thí sinh với thông tin nhóm thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getDetailWithGroups(req: Request, res: Response): Promise<void> {
    try {
      const contestantId = Number(req.params.id);
      const contestSlug = req.params.slug;
      const matchId = Number(req.params.matchId);

      if (!contestantId || !matchId) {
        throw new Error("ID thí sinh và ID trận đấu không hợp lệ");
      }

      const contestant = await ContestantService.getContestantDetailWithGroups(
        contestantId,
        contestSlug,
        matchId
      );

      if (!contestant) {
        throw new Error("Không tìm thấy thí sinh trong cuộc thi này");
      }

      // Transform data to include group info properly
      const responseData = {
        id: contestant.id,
        roundId: contestant.roundId,
        studentId: contestant.studentId,
        status: contestant.status,
        student: contestant.student,
        round: contestant.round,
        contest: contestant.contest,
        group: contestant.contestantMatches?.[0]?.group || null,
      };

      logger.info(
        `Lấy thông tin thí sinh ${contestant.student.fullName} trong trận đấu thành công`
      );
      res.json(
        successResponse(
          responseData,
          `Lấy thông tin thí sinh ${contestant.student.fullName} trong trận đấu thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  // Lấy danh sách thí sinh trong trận đấu theo slug cuộc thi và id trận đấu
  static async getContestantsInMatch(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const slug = req.params.slug;
      const matchId = parseInt(req.params.matchId);

      // Lấy các filter từ query
      const query = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: req.query.search as string | undefined,
        groupId: req.query.groupId
          ? parseInt(req.query.groupId as string)
          : undefined,
        schoolId: req.query.schoolId
          ? parseInt(req.query.schoolId as string)
          : undefined,
        classId: req.query.classId
          ? parseInt(req.query.classId as string)
          : undefined,
        roundId: req.query.roundId
          ? parseInt(req.query.roundId as string)
          : undefined,
        status: req.query.status as ContestantStatus | undefined,
        schoolIds: req.query.schoolIds
          ? typeof req.query.schoolIds === "string"
            ? (req.query.schoolIds as string).split(",").map(Number)
            : Array.isArray(req.query.schoolIds)
            ? (req.query.schoolIds as string[]).flatMap(val =>
                val.split(",").map(Number)
              )
            : undefined
          : undefined,
        classIds: req.query.classIds
          ? typeof req.query.classIds === "string"
            ? (req.query.classIds as string).split(",").map(Number)
            : Array.isArray(req.query.classIds)
            ? (req.query.classIds as string[]).flatMap(val =>
                val.split(",").map(Number)
              )
            : undefined
          : undefined,
      };

      const data = await ContestantService.getContestantsInMatch(
        slug,
        matchId,
        query
      );

      logger.info(
        `Lấy danh sách thí sinh trong trận đấu ${matchId} thành công`
      );
      res.json(
        successResponse(
          data,
          "Lấy danh sách thí sinh trong trận đấu thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  // API cứu trợ: lấy danh sách thí sinh bị loại theo tiêu chí cứu trợ
  static async getRescueCandidates(req: Request, res: Response): Promise<void> {
    try {
      const matchId = Number(req.params.matchId); // chuyển đổi matchId sang số
      const rescueId = req.query.rescueId
        ? Number(req.query.rescueId)
        : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined; // số lượng thí sinh cần cứu

      if (!matchId || isNaN(matchId)) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu hoặc sai matchId" });
        return;
      }
      if (!rescueId || isNaN(rescueId)) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu hoặc sai rescueId" });
        return;
      }

      // Validate limit nếu có
      if (limit !== undefined && (isNaN(limit) || limit <= 0)) {
        res
          .status(400)
          .json({ success: false, message: "Limit phải là số nguyên dương" });
        return;
      }

      const data = await ContestantService.getRescueCandidates(
        matchId,
        rescueId,
        limit
      );
      res.json({ success: true, ...data });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: (error as Error).message });
    }
  }

  // API cứu trợ hàng loạt
  static async rescueMany(req: Request, res: Response): Promise<void> {
    try {
      const matchId = Number(req.params.matchId);
      if (!matchId || isNaN(matchId)) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu hoặc sai matchId" });
        return;
      }
      const { contestantIds, currentQuestionOrder, rescueId } = req.body;
      if (
        !Array.isArray(contestantIds) ||
        contestantIds.length === 0 ||
        !currentQuestionOrder
      ) {
        res.status(400).json({
          success: false,
          message: "Thiếu dữ liệu contestantIds hoặc currentQuestionOrder",
        });
        return;
      }
      const result = await ContestantService.rescueMany(
        matchId,
        contestantIds,
        currentQuestionOrder,
        rescueId
      );
      res.json({
        success: true,
        updatedCount: result.count,
        rescueUpdated: result.rescueUpdated,
      });

      // Báo ngay cho app thí sinh đang mở màn hình câu hỏi; nếu không, thí sinh
      // chỉ biết mình được cứu khi thoát ra vào lại trận.
      try {
        const match = await prisma.match.findUnique({
          where: { id: matchId },
          select: { id: true, slug: true },
        });
        const rows = await prisma.contestantMatch.findMany({
          where: { matchId, contestantId: { in: contestantIds.map(Number) } },
          select: { contestantId: true, registrationNumber: true },
        });
        if (match) {
          notifyStudentsRescued(socketService.getIO(), match, rows);
          // Màn chiếu, admin và trọng tài thấy ngay trạng thái mới.
          if (match.slug) {
            const ListContestant = await MatchService.ListContestant(match.id);
            socketService
              .getIO()
              .of("/match-control")
              .to(`match-${match.slug}`)
              .emit("contestant:status-update", { ListContestant });
          }
        }
      } catch (emitError) {
        logger.error(
          `Không gửi được thông báo cứu trợ: ${(emitError as Error).message}`
        );
      }
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: (error as Error).message });
    }
  }

  // API lấy danh sách thí sinh bị loại trong 1 trận đấu
  static async getEliminatedContestants(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const matchId = Number(req.params.matchId);
      if (!matchId || isNaN(matchId)) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu hoặc sai matchId" });
        return;
      }
      const data = await ContestantService.getEliminatedContestants(matchId);
      res.json({ success: true, data });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: (error as Error).message });
    }
  }

  // API lấy danh sách thí sinh bị loại có phân trang, lọc, tìm kiếm
  static async getEliminatedContestantsWithFilter(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const matchId = Number(req.params.matchId);
      if (!matchId || isNaN(matchId)) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu hoặc sai matchId" });
        return;
      }
      const query = req.query;
      const data = await ContestantService.getEliminatedContestantsWithFilter(
        query,
        matchId
      );
      res.json({ success: true, ...data });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: (error as Error).message });
    }
  }

  // Danh sách thí sinh còn trong trận (chưa bị loại/bị cấm) để chọn qua vòng
  static async getAdvanceCandidatesWithFilter(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const matchId = Number(req.params.matchId);
      if (!matchId || isNaN(matchId)) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu hoặc sai matchId" });
        return;
      }
      const data = await ContestantService.getEliminatedContestantsWithFilter(
        req.query,
        matchId,
        [...ADVANCEABLE_STATUSES]
      );
      res.json({ success: true, ...data });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: (error as Error).message });
    }
  }

  // Controller: Lấy danh sách thí sinh đã được cứu trợ theo rescueId
  static async getRescuedContestantsByRescueId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const rescueId = Number(req.params.rescueId);
      if (!rescueId || isNaN(rescueId)) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu hoặc sai rescueId" });
        return;
      }
      const data = await ContestantService.getRescuedContestantsByRescueId(
        rescueId
      );
      res.json({ success: true, ...data });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: (error as Error).message });
    }
  }

  // Controller: Thêm hàng loạt studentIds vào rescue (push, không trùng lặp)
  static async addStudentsToRescue(req: Request, res: Response): Promise<void> {
    try {
      const { rescueId, studentIds } = req.body;

      if (!rescueId || isNaN(rescueId)) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu hoặc sai rescueId" });
        return;
      }

      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        res.status(400).json({
          success: false,
          message: "Thiếu hoặc sai danh sách studentIds",
        });
        return;
      }

      const data = await ContestantService.addStudentsToRescue(
        rescueId,
        studentIds
      );
      res.json({
        success: true,
        message: `Đã thêm ${data.addedCount} sinh viên vào rescue. Tổng cộng: ${data.totalCount} sinh viên`,
        ...data,
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: (error as Error).message });
    }
  }

  // Controller: Xóa 1 studentId khỏi rescue
  static async removeStudentFromRescue(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { rescueId, studentId } = req.body;

      if (!rescueId || isNaN(rescueId)) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu hoặc sai rescueId" });
        return;
      }

      if (!studentId || isNaN(studentId)) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu hoặc sai studentId" });
        return;
      }

      const data = await ContestantService.removeStudentFromRescue(
        rescueId,
        studentId
      );
      res.json({
        success: true,
        message: `Đã xóa sinh viên ${data.removedStudentId} khỏi rescue. Còn lại: ${data.totalCount} sinh viên`,
        ...data,
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: (error as Error).message });
    }
  }

  static async listContestant(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;

      console.log(`Lấy danh sách thí sinh trong cuộc thi với slug: ${slug}`);

      const contest = await prisma.contest.findFirst({ where: { slug: slug } });
      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }

      const contestants = await ContestantService.listContestant(contest.id);
      if (!contestants) {
        throw new Error("Không tìm thấy thí sinh viên trong cuộc thi này");
      }

      res.json(
        successResponse(contestants, "Lấy danh sách sinh viên thành công")
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  // API cập nhật trạng thái thành completed cho các thí sinh trong trận đấu
  // API cho biết có phải cứu trợ trước khi xét qua vòng hay không
  static async advanceGuard(req: Request, res: Response): Promise<void> {
    try {
      const matchId = Number(req.params.matchId);
      if (!matchId || isNaN(matchId)) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu hoặc sai matchId" });
        return;
      }
      res.json({ success: true, data: await getAdvanceGuard(matchId) });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: (error as Error).message });
    }
  }

  static async updateToCompleted(req: Request, res: Response): Promise<void> {
    try {
      const matchId = Number(req.params.matchId);
      if (!matchId || isNaN(matchId)) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu hoặc sai matchId" });
        return;
      }

      const { contestantIds } = req.body;
      if (!Array.isArray(contestantIds) || contestantIds.length === 0) {
        res.status(400).json({
          success: false,
          message: "Thiếu dữ liệu contestantIds hoặc contestantIds rỗng",
        });
        return;
      }

      // Validate all contestantIds are numbers
      const invalidIds = contestantIds.filter(id => !Number.isInteger(Number(id)));
      if (invalidIds.length > 0) {
        res.status(400).json({
          success: false,
          message: `Các ID không hợp lệ: ${invalidIds.join(', ')}`,
        });
        return;
      }

      // Cứu trợ trước, qua vòng sau (xem advanceGuard).
      const guard = await getAdvanceGuard(matchId);
      if (guard.blocked) {
        res.status(409).json({ success: false, message: guard.message });
        return;
      }
      const ineligible = await getIneligibleAdvanceMessage(matchId, {
        contestantIds: contestantIds.map(Number),
      });
      if (ineligible) {
        res.status(409).json({ success: false, message: ineligible });
        return;
      }

      const result = await ContestantService.updateToCompleted(
        matchId,
        contestantIds.map(Number)
      );

      res.json({
        ...result
      });
    } catch (error) {
      logger.error('Error in updateToCompleted:', error);
      res
        .status(500)
        .json({ success: false, message: (error as Error).message });
    }
  }

  // API cập nhật trạng thái thành eliminated cho các thí sinh trong trận đấu (từ completed về eliminated)
  static async updateToEliminated(req: Request, res: Response): Promise<void> {
    try {
      const matchId = Number(req.params.matchId);
      if (!matchId || isNaN(matchId)) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu hoặc sai matchId" });
        return;
      }

      const { contestantIds } = req.body;
      if (!Array.isArray(contestantIds) || contestantIds.length === 0) {
        res.status(400).json({
          success: false,
          message: "Thiếu dữ liệu contestantIds hoặc contestantIds rỗng",
        });
        return;
      }

      // Validate all contestantIds are numbers
      const invalidIds = contestantIds.filter(id => !Number.isInteger(Number(id)));
      if (invalidIds.length > 0) {
        res.status(400).json({
          success: false,
          message: `Các ID không hợp lệ: ${invalidIds.join(', ')}`,
        });
        return;
      }

      const result = await ContestantService.updateToEliminated(
        matchId,
        contestantIds.map(Number)
      );

      res.json({
        ...result
      });
    } catch (error) {
      logger.error('Error in updateToEliminated:', error);
      res
        .status(500)
        .json({ success: false, message: (error as Error).message });
    }
  }

  // API lấy danh sách thí sinh ứng cử viên cứu trợ (chỉ lấy dữ liệu, không cập nhật bảng rescue)
  static async getCandidatesList(req: Request, res: Response): Promise<void> {
    try {
      const matchId = Number(req.params.matchId);
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      if (!matchId || isNaN(matchId)) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu hoặc sai matchId" });
        return;
      }

      // Validate limit nếu có
      if (limit !== undefined && (isNaN(limit) || limit <= 0)) {
        res
          .status(400)
          .json({ success: false, message: "Limit phải là số nguyên dương" });
        return;
      }

      const data = await ContestantService.getCandidatesList(matchId, limit);
      
      logger.info(`Lấy danh sách ứng cử viên cứu trợ trong trận đấu ${matchId} thành công`);
      res.json(
        successResponse(
          data,
          "Lấy danh sách ứng cử viên cứu trợ thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  // API lấy danh sách thí sinh đã hoàn thành (completed) trong trận đấu
  static async getCompletedContestants(req: Request, res: Response): Promise<void> {
    try {
      const matchId = Number(req.params.matchId);
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      if (!matchId || isNaN(matchId)) {
        res
          .status(400)
          .json({ success: false, message: "Thiếu hoặc sai matchId" });
        return;
      }

      // Validate limit nếu có
      if (limit !== undefined && (isNaN(limit) || limit <= 0)) {
        res
          .status(400)
          .json({ success: false, message: "Limit phải là số nguyên dương" });
        return;
      }

      const data = await ContestantService.getCompletedContestants(matchId, limit);
      
      logger.info(`Lấy danh sách thí sinh đã hoàn thành trong trận đấu ${matchId} thành công`);
      res.json(
        successResponse(
          data,
          "Lấy danh sách thí sinh đã hoàn thành thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  // API cập nhật tất cả thí sinh completed về eliminated trong trận đấu
  static async updateAllCompletedToEliminated(req: Request, res: Response): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      
      if (!matchId || matchId <= 0) {
        throw new Error("ID trận đấu không hợp lệ");
      }

      const result = await ContestantService.updateAllCompletedToEliminated(matchId);

      logger.info(`Cập nhật tất cả thí sinh completed về eliminated trong trận đấu ${matchId} thành công`);
      res.json(
        successResponse(
          result,
          result.message
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}

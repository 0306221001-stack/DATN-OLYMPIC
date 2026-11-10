import { Request, Response } from "express";
import {
  MatchService,
  MatchQueryInput,
  CreateMatchInput,
  UpdateMatchInput,
  deleteMatchesSchema,
} from "@/modules/match";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";
import { ContestStatus } from "@prisma/client";
import { createLogger } from "winston";
export default class MatchController {
  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const statusQuery = req.query.status as string;

      const contest = await prisma.contest.findFirst({ where: { slug: slug } });
      if (!contest) throw new Error("Không tìm thấy cuộc thi");
      const query: MatchQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        contestId: parseInt(req.query.contestId as string) || undefined,
        questionPackageId:
          parseInt(req.query.questionPackageId as string) || undefined,
        roundId: parseInt(req.query.roundId as string) || undefined,
        status: Object.values(ContestStatus).includes(
          statusQuery as ContestStatus
        )
          ? (statusQuery as ContestStatus)
          : undefined,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === "true"
            : undefined,
      };
      const data = await MatchService.getAll(query, contest.id);
      if (!data) {
        throw new Error("Không tìm thấy trận đấu");
      }
      logger.info(`Lấy danh sách trận đấut hành công`);
      res.json(
        successResponse(
          { matches: data.matches, pagination: data.pagination },
          "Lấy danh sách trận đấu thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateMatchInput = req.body;

      const contest = await prisma.contest.findFirst({
        where: { slug: req.params.slug },
      });
      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }

      const QuestionPackage = await prisma.questionPackage.findFirst({
        where: { id: input.questionPackageId },
      });
      if (!QuestionPackage) throw Error("Không tìm thấy gói câu hỏi");

      const countQuestion = await prisma.questionDetail.count({
        where: { questionPackageId: input.questionPackageId },
      });

      if (countQuestion < 1) {
        throw new Error("Gói câu hỏi không có câu hỏi nào");
      }
      if (countQuestion < input.currentQuestion) {
        throw new Error(
          `Gói câu hỏi chỉ có ${countQuestion} câu hỏi, không đủ cho trận đấu`
        );
      }

      const round = await prisma.round.findFirst({
        where: { id: input.roundId },
      });
      if (!round) throw Error("Không tìm thấy vòng đấu");

      const question = await MatchService.CurrentQuestion(
        input.currentQuestion,
        QuestionPackage.id
      );

      if (!question) throw new Error(`Tạo trận đấu thất bại`);
      input.remainingTime = question.defaultTime;
      const slug = await MatchService.generateUniqueSlug(input.name);
      input.slug = slug;
      input.contestId = contest.id;
      const Match = await MatchService.create(input);

      if (!Match) {
        throw new Error(`Thêm trận đấu${input.name} thành công`);
      }

      await prisma.screenControl.create({ data: { matchId: Match.id } });

      logger.info(`Thêm trận đấu${input.name} thành công`);
      res.json(successResponse(Match, `Thêm trận đấu${input.name} thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const Match = await MatchService.getMatchBy({ id: Number(id) });
      if (!Match) {
        throw new Error("Không tìm thấy trận đấu");
      }
      const updateMatch = await MatchService.update(Number(id), {
        isActive: !Match.isActive,
      });
      if (!updateMatch) {
        throw new Error("Cập nhật trạng thái trận đấu thất bại ");
      }
      logger.info(`Cập nhật trạng thái trận đấu ${Match.name} thành công`);
      res.json(
        successResponse(
          updateMatch,
          `Cập nhật trạng thái trận đấu${Match.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const round = await MatchService.getMatchBy({ id: Number(id) });
      if (!round) {
        throw new Error("Không tìm thấy trận đấu");
      }
      logger.info(`Lấy thông tin trận đấu${round.name} thành công`);
      res.json(
        successResponse(round, `Lấy thông tin trận đấu${round.name} thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const Match = await MatchService.getMatchBy({ id: Number(id) });
      if (!Match) {
        throw new Error("Không tìm thấy trận đấu");
      }

      // Nhóm, thí sinh trong trận, kết quả, cứu trợ, giải thưởng và màn hình
      // chiếu được xóa cùng trận (xem MatchService.deleteMatchesWithData).
      const deleteMatch = await MatchService.deleteMatch(Match.id);
      if (!deleteMatch) {
        throw new Error(`Xóa trận đấu "${Match.name}" thất bại`);
      }
      logger.info(`Xóa trận đấu "${Match.name}" thành công`);
      res.json(
        successResponse(null, `Xóa trận đấu "${Match.name}" thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const input: UpdateMatchInput = req.body;

      const contest = await prisma.contest.findFirst({
        where: { id: input.contestId },
      });

      if (!contest) throw new Error("Không tìm thấy cuộc thi");

      const QuestionPackage = await prisma.questionPackage.findFirst({
        where: { id: input.questionPackageId },
      });
      if (!QuestionPackage) throw Error("Không tìm thấy gói câu hỏi");

      const countQuestion = await prisma.questionDetail.count({
        where: { questionPackageId: input.questionPackageId },
      });
      if (countQuestion < 1) {
        throw new Error("Gói câu hỏi không có câu hỏi nào");
      }

      if (input.currentQuestion && countQuestion < input.currentQuestion) {
        throw new Error(
          `Gói câu hỏi chỉ có ${countQuestion} câu hỏi, không đủ cho trận đấu`
        );
      }

      const round = await prisma.round.findFirst({
        where: { id: input.roundId },
      });
      if (!round) throw Error("Không tìm thấy vòng đấu");

      const Match = await MatchService.getMatchBy({ id: Number(id) });
      if (!Match) {
        throw new Error("Không tìm thấy vòng thi");
      }
      const updateMatch = await MatchService.update(Number(id), input);
      if (!updateMatch) {
        throw new Error("Cập nhật vòng thi thất bại");
      }
      logger.info(`Cập nhật vòng thi  ${Match.name} thành công`);
      res.json(
        successResponse(
          updateMatch,
          `Cập nhật vòng thi ${Match.name} thành công`
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
        throw new Error("Danh sách không hợp lệ");
      }
      const messages: { status: "success" | "error"; msg: string }[] = [];
      for (const id of ids) {
        const Match = await MatchService.getMatchBy({ id: Number(id) });
        if (!Match) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy trận đấuvới ID = ${id}`,
          });
          continue;
        }

        try {
          await MatchService.deleteMatch(Match.id);
        } catch (error) {
          logger.error(
            `Xóa trận đấu "${Match.name}" thất bại: ${(error as Error).message}`
          );
          messages.push({
            status: "error",
            msg: `Xóa trận đấu "${Match.name}" thất bại`,
          });
          continue;
        }
        messages.push({
          status: "success",
          msg: `Xóa trận đấu "${Match.name}" thành công`,
        });
        logger.info(`Xóa trận đấu "${Match.name}" thành công`);
      }
      res.json({
        success: true,
        messages,
      });
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async getListMatch(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const contest = await prisma.contest.findFirst({ where: { slug: slug } });
      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }
      const match = await MatchService.getListMatch(slug);
      if (!match) {
        throw new Error("Không tìm thấy trận đấu");
      }
      logger.info(`Lấy thông tin trận đấu thành công`);
      res.json(successResponse(match, `Lấy thông tin trận đấu thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async matchInfo(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const match = await MatchService.MatchControl(slug);

      if (!match) throw new Error("Không tìm thấy trận đấu");

      res.json(successResponse(match, `Lấy thông tin trận đấu thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async ListQuestion(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const match = await MatchService.MatchControl(slug);

      if (!match) throw new Error("Không tìm thấy trận đấu");

      const ListQuestion = await MatchService.ListQuestion(
        match.questionPackageId
      );

      res.json(
        successResponse(ListQuestion, `Lấy thông tin trận đấu thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async bgContest(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const match = await MatchService.MatchControl(slug);

      if (!match) throw new Error("Không tìm thấy trận đấu");

      const bgContest = await MatchService.bgContest(match.contestId);

      res.json(successResponse(bgContest, `Lấy thông tin trận đấu thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async ScreenControl(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;

      const match = await MatchService.MatchControl(slug);
      if (!match) {
        throw new Error("Không tìm thấy trận đấu");
      }

      const bgContest = await MatchService.bgContest(match.contestId);

      let screenControl = await MatchService.ScreenControl(match.id);

      if (screenControl?.controlKey === "background") {
        screenControl = await prisma.screenControl.update({
          where: { id: screenControl.id },
          data: {
            media: bgContest?.url,
          },
        });
      }

      res.json(
        successResponse(
          screenControl,
          "Lấy thông tin điều khiển màn hình thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async CurrentQuestion(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const match = await MatchService.MatchControl(slug);
      if (!match) throw new Error("Không tìm thấy trận đấu");

      const CurrentQuestion = await MatchService.CurrentQuestion(
        match.currentQuestion,
        match.questionPackageId
      );

      res.json(
        successResponse(CurrentQuestion, `Lấy thông tin trận đấu thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async ListRescues(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const match = await MatchService.MatchControl(slug);

      if (!match) throw new Error("Không tìm thấy trận đấu");

      const ListRescues = await MatchService.ListRescues(match.id);

      res.json(
        successResponse(ListRescues, `Lấy thông tin trận đấu thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async ListContestant(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const match = await MatchService.MatchControl(slug);

      if (!match) throw new Error("Không tìm thấy trận đấu");

      const ListContestant = await MatchService.ListContestant(match.id);

      res.json(
        successResponse(ListContestant, `Lấy thông tin trận đấu thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async countContestant(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const match = await MatchService.MatchControl(slug);

      if (!match) throw new Error("Không tìm thấy trận đấu");

      const countIn_progress = await MatchService.countIn_progress(match.id);

      const countEliminated = await MatchService.countEliminated(match.id);

      const total = await MatchService.Total(match.id);

      res.json(
        successResponse(
          {
            countIn_progress: countIn_progress,
            countEliminated: countEliminated,
            total: total,
          },
          `Lấy thông tin trận đấu thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getListMatchByJudgeId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const judgeId = req.user?.userId;

      if (!judgeId) {
        throw new Error("ID giám khảo không hợp lệ");
      }

      const id: number = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new Error("ID không hợp lệ");
      }

      const match = await MatchService.getListMatchByJudgeId(id, judgeId);

      res.json(successResponse(match, "Lấy danh sách trận đấu thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}

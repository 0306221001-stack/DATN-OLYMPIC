import { Request, Response } from "express";
import {
  RoundQueryInput,
  RoundService,
  CreateRoundInput,
  UpdateRoundInput,
} from "@/modules/round";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";

export default class RoundController {
  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      if (!slug) throw new Error("Thiếu mã cuộc thi");
      const contest = await prisma.contest.findUnique({
        where: { slug: slug },
      });
      if (!contest) throw new Error(` Không tim thấy cuộc thi`);

      const query: RoundQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === "true"
            : undefined,
      };
      const data = await RoundService.getAll(query, contest.id);
      if (!data) {
        throw new Error("Không tìm thấy vòng đấu ");
      }
      logger.info(`Lấy danh sách vòng đấu thành công`);
      res.json(
        successResponse(
          { rounds: data.rounds, pagination: data.pagination },
          "Lấy danh sách vòng đấu thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getRoundById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const round = await RoundService.getRoundBy({ id: Number(id) });
      if (!round) {
        throw new Error("Không tìm thấy vòng đấu ");
      }
      logger.info(`Lấy thông tin vòng đấu ${round.name} thành công`);
      res.json(
        successResponse(
          round,
          `Lấy thông tin vòng đấu ${round.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async createRound(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const input: Omit<CreateRoundInput, "contestId"> = req.body;
      const contest = await prisma.contest.findFirst({
        where: { slug: slug },
      });
      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }
      if (input.startTime > input.endTime)
        throw new Error("Ngày bắt đầu vòng đấu phải lớn hơn ngày kết thúc");
      const round = await RoundService.createRound({
        ...input,
        contestId: contest.id,
      });
      if (!round) {
        throw new Error(`Thêm vòng đấu ${input.name} thành công`);
      }
      logger.info(`Thêm vòng đấu ${input.name} thành công`);
      res.json(
        successResponse(round, `Thêm vòng đấu ${input.name} thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const round = await RoundService.getRoundBy({ id: Number(id) });
      if (!round) {
        throw new Error("Không tìm thấy vòng đấu ");
      }
      const updateRound = await RoundService.updateRound(Number(id), {
        isActive: !round.isActive,
      });
      if (!updateRound) {
        throw new Error("Cập nhật trạng thái vòng đấu thất bại ");
      }
      logger.info(`Cập nhật trạng thái vòng đấu  ${round.name} thành công`);
      res.json(
        successResponse(
          updateRound,
          `Cập nhật trạng thái vòng đấu ${round.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async deleteRound(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const Round = await RoundService.getRoundBy({ id: Number(id) });
      if (!Round) {
        throw new Error("Không tìm thấy vòng đấu ");
      }
      // Trận của vòng được xóa cùng vòng. Thí sinh thì không: họ còn thi ở các
      // trận của vòng khác, xóa theo vòng sẽ mất cả kết quả ở đó.
      const countContestants = await RoundService.countContestantsByRoundId(
        Number(id)
      );
      if (countContestants > 0) {
        throw new Error(
          `Vòng "${Round.name}" còn ${countContestants} thí sinh đăng ký. Hãy xóa hoặc chuyển các thí sinh này sang vòng khác trước khi xóa vòng`
        );
      }
      const deleteRound = await RoundService.deleteRound(Round.id);
      if (!deleteRound) {
        throw new Error(`Xóa vòng đấu ${Round.name} thất bại `);
      }
      logger.info(`Xóa vòng đấu ${Round.name} thành công`);
      res.json(successResponse(null, `Xóa vòng đấu ${Round.name} thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async updateRound(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const input: UpdateRoundInput = req.body;
      const contest = await prisma.contest.findFirst({
        where: { id: input.contestId },
      });
      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }
      const Round = await RoundService.getRoundBy({ id: Number(id) });

      if (!Round) {
        throw new Error("Không tìm thấy vòng thi");
      }

      if (input.startTime !== undefined) {
        if (input.startTime > Round.endTime)
          throw new Error("Ngày bắt đầu vòng đấu phải lớn hơn ngày kết thúc");
      }

      if (input.endTime !== undefined) {
        if (input.endTime < Round.startTime)
          throw new Error("Ngày bắt đầu vòng đấu phải lớn hơn ngày kết thúc");
      }

      if (input.startTime !== undefined && input.endTime !== undefined) {
        if (input.startTime > input.endTime) {
          throw new Error("Ngày bắt đầu vòng đấu phải nhỏ hơn ngày kết thúc");
        }
      }

      const updateRound = await RoundService.updateRound(Number(id), input);
      if (!updateRound) {
        throw new Error("Cập nhật vòng thi thất bại");
      }
      logger.info(`Cập nhật vòng thi  ${Round.name} thành công`);
      res.json(
        successResponse(
          updateRound,
          `Cập nhật vòng thi ${Round.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async deleteRounds(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        throw new Error("Danh sách không hợp lệ");
      }

      const messages: { status: "success" | "error"; msg: string }[] = [];

      for (const id of ids) {
        const round = await RoundService.getRoundBy({ id: Number(id) });

        if (!round) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy vòng đấu với ID = ${id}`,
          });
          continue;
        }

        const countContestants = await RoundService.countContestantsByRoundId(
          round.id
        );
        if (countContestants > 0) {
          messages.push({
            status: "error",
            msg: `Vòng "${round.name}" còn ${countContestants} thí sinh đăng ký. Hãy xóa hoặc chuyển các thí sinh này sang vòng khác trước khi xóa vòng`,
          });
          continue;
        }

        try {
          await RoundService.deleteRound(round.id);
        } catch (error) {
          logger.error(
            `Xóa vòng đấu "${round.name}" thất bại: ${(error as Error).message}`
          );
          messages.push({
            status: "error",
            msg: `Xóa vòng đấu "${round.name}" thất bại`,
          });
          continue;
        }

        messages.push({
          status: "success",
          msg: `Xóa vòng đấu "${round.name}" thành công`,
        });
        logger.info(`Xóa vòng đấu "${round.name}" thành công`);
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

  static async getListRound(req: Request, res: Response): Promise<void> {
    try {
      const contest = await prisma.contest.findFirst({
        where: { slug: req.params.slug },
      });
      if (!contest) throw new Error("Không tìm thấy trận đấu");
      const round = await RoundService.getListRound(contest?.id);
      if (!round) {
        throw new Error("Không tìm thấy vòng đấu ");
      }
      logger.info(`Lấy thông tin vòng đấu thành công`);
      res.json(successResponse(round, `Lấy danh sách  vòng đấu thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getRoundByContestId(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      let round: any;

      if (isNaN(Number(id))) {
        round = await prisma.round.findMany({
          select: {
            id: true,
            name: true,
          },
        });

        logger.info("Lấy danh sách tất cả lớp thành công");
        res.json(successResponse(round, "Lấy danh sách tất cả lớp thành công"));
        return;
      }
      const contest = await prisma.contest.findFirst({
        where: { id: Number(id) },
      });

      if (!contest) throw new Error("Không tìm thấy thuộc thi");

      round = await RoundService.getListRound(contest.id);

      logger.info("Lấy danh sách vòng đấu thành công");
      res.json(successResponse(round, "Lấy danh sách vòng đấu  thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}

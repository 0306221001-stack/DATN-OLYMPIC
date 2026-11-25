import { Request, Response } from "express";
import {
  ContestQueryInput,
  Contestervice,
  CreateContestInput,
  UpdateContestInput,
} from "@/modules/contest";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { ContestStatus, User } from "@prisma/client";
import { prisma } from "@/config/database";
import { htmlToPlainText } from "@/utils/html";

export default class ContestController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateContestInput = req.body;
      const slug = await Contestervice.generateUniqueSlug(input.name);
      const textplan = await htmlToPlainText(input.rule);
      const data = {
        name: input.name,
        slug: slug,
        rule: input.rule,
        plainText: textplan,
        location: input.location,
        startTime: input.startTime,
        endTime: input.endTime,
        slogan: input.slogan,
        status: input.status,
        isActive: input.isActive,
      };

      const contest = await Contestervice.create(data);

      logger.info(`Thêm cuộc thi thành công`);
      res.json(successResponse(contest, "Thêm cuộc thi thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const query: ContestQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        status: req.query.status as ContestStatus | undefined,
      };
      const data = await Contestervice.getAll(query);
      if (!data) {
        throw new Error("Không tìm thấy cuộc thi ");
      }
      logger.info(`Lấy danh sách cuộc thi thành công`);
      res.json(
        successResponse(
          { Contest: data.Contest, pagination: data.pagination },
          "Lấy danh sách cuộc thi  thành công"
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
      const Contest = await Contestervice.getBy({ id: Number(id) });
      if (!Contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }
      logger.info(`Lấy thông tin cuộc thi ${Contest.name} thành công`);
      res.json(
        successResponse(
          Contest,
          `Lấy thông tin cuộc thi ${Contest.name} thành công`
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
      const contest = await Contestervice.getBy({ id: Number(id) });

      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi ");
      }
      const countRound = await prisma.round.count({
        where: { contestId: contest.id },
      });
      if (countRound > 0) {
        throw new Error(
          ` Cuộc thi này đang có ${countRound} vòng đấu không thể xóa`
        );
      }
      const countMatch = await prisma.match.count({
        where: { contestId: contest.id },
      });
      if (countMatch > 0) {
        throw new Error(
          ` Cuộc thi này đang có ${countMatch} trận đấu không thể xóa`
        );
      }

      const countMedia = await prisma.media.count({
        where: { contestId: contest.id },
      });
      if (countMedia > 0) {
        throw new Error(
          ` Cuộc thi này đang có ${countMedia} media không thể xóa`
        );
      }

      const countContestants = await prisma.contestant.count({
        where: { contestId: contest.id },
      });
      if (countContestants > 0) {
        throw new Error(
          ` Cuộc thi này đang có ${countContestants} thí sinh không thể xóa`
        );
      }

      const countSpo = await prisma.sponsor.count({
        where: { contestId: contest.id },
      });
      if (countSpo > 0) {
        throw new Error(
          ` Cuộc thi này đang có ${countSpo} nhà tài trợ không thể xóa`
        );
      }

      const countClassVieo = await prisma.classVideo.count({
        where: { contestId: contest.id },
      });
      if (countClassVieo > 0) {
        throw new Error(
          ` Cuộc thi này đang có ${countClassVieo} video tham gia không thể xóa`
        );
      }

      const countAwrad = await prisma.award.count({
        where: { contestId: contest.id },
      });
      if (countAwrad > 0) {
        throw new Error(
          ` Cuộc thi này đang có ${countAwrad} giải thưởng không thể xóa`
        );
      }
      const deletecontest = await Contestervice.delete(contest.id);
      if (!deletecontest) {
        throw new Error(`Xóa cuộc thi ${contest.name} thất bại `);
      }
      logger.info(`Xóa cuộc thi ${contest.name} thành công`);
      res.json(
        successResponse(null, `Xóa cuộc thi ${contest.name} thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async deleteMany(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        throw new Error("Danh sách ID không hợp lệ");
      }

      const messages: { status: "success" | "error"; msg: string }[] = [];

      for (const id of ids) {
        const contest = await Contestervice.getBy({ id: Number(id) });

        if (!contest) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy cuộc thi với ID = ${id}`,
          });
          continue;
        }

        // Kiểm tra liên kết
        const relatedChecks = await Promise.all([
          prisma.round.count({ where: { contestId: contest.id } }),
          prisma.match.count({ where: { contestId: contest.id } }),
          prisma.contestant.count({ where: { contestId: contest.id } }),
          prisma.sponsor.count({ where: { contestId: contest.id } }),
          prisma.classVideo.count({ where: { contestId: contest.id } }),
          prisma.award.count({ where: { contestId: contest.id } }),
        ]);

        const types = [
          "vòng đấu",
          "trận đấu",
          "thí sinh",
          "nhà tài trợ",
          "video tham gia",
          "giải thưởng",
        ];

        const indexViolated = relatedChecks.findIndex(count => count > 0);

        if (indexViolated !== -1) {
          messages.push({
            status: "error",
            msg: `Cuộc thi "${contest.name}" đang có ${relatedChecks[indexViolated]} ${types[indexViolated]}, không thể xóa.`,
          });
          continue;
        }

        // Không liên kết -> xóa
        const deleted = await Contestervice.delete(contest.id);
        if (!deleted) {
          messages.push({
            status: "error",
            msg: `Xóa cuộc thi "${contest.name}" thất bại`,
          });
          continue;
        }

        messages.push({
          status: "success",
          msg: `Xóa cuộc thi "${contest.name}" thành công`,
        });
        logger.info(`Xóa cuộc thi "${contest.name}" thành công`);
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

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const input: UpdateContestInput = req.body;
      const contest = await Contestervice.getBy({ id: Number(id) });
      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi ");
      }
      const updatecontest = await Contestervice.update(Number(id), input);
      if (!updatecontest) {
        throw new Error("Cập nhật trạng thái cuộc thi thất bại");
      }
      logger.info(`Cập nhật trạng thái cuộc thi  ${contest.name} thành công`);
      res.json(
        successResponse(
          updatecontest,
          `Cập nhật trạng thái cuộc thi ${contest.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async toggle(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const contest = await Contestervice.getBy({ id: Number(id) });
      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi ");
      }
      const updatecontest = await Contestervice.update(Number(id), {
        isActive: !contest.isActive,
      });
      if (!updatecontest) {
        throw new Error("Cập nhật trạng thái cuộc thi thất bại");
      }
      logger.info(`Cập nhật trạng thái cuộc thi  ${contest.name} thành công`);
      res.json(
        successResponse(
          updatecontest,
          `Cập nhật  trạng thái cuộc thi ${contest.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async ListContestNotSlug(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const Contest = await Contestervice.ListContest(slug);
      if (!Contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }
      logger.info(`Lấy thông tin cuộc thi thành công`);
      res.json(successResponse(Contest, `Lấy danh sách cuộc thi thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getListContestByJudgeId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const judgeId = req.user?.userId;

      if (!judgeId) {
        throw new Error("ID giám khảo không hợp lệ");
      }
      const contests = await Contestervice.getListContestByJudgeId(judgeId);
      if (!contests) {
        throw new Error("Không tìm thấy cuộc thi cho giám khảo này");
      }
      logger.info(`Lấy danh sách cuộc thi cho giám khảo thành công`);
      res.json(successResponse(contests, "Lấy danh sách cuộc thi thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}

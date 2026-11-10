import { Request, Response } from "express";
import {
  CreateScreenInput,
  UpdateScreenInput,
  ScreenService,
  ScreenQueryInput,
} from "@/modules/screen";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";
export default class ScreenController {
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const screen = await ScreenService.getBy({ id: Number(id) });
      if (!screen) {
        throw new Error("Không tìm thấy màn hình ");
      }
      logger.info(`Lấy thông tin màn hình thành công`);
      res.json(successResponse(screen, `Lấy thông tin màn hình thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateScreenInput = req.body;
      const extingMatchId = await ScreenService.getBy({
        matchId: input.matchId,
      });
      if (extingMatchId) throw new Error("Trận đấu này đã có màn hình chiếu");
      const match = await prisma.match.findUnique({
        where: { id: input.matchId },
      });
      if (!match) throw new Error("Không tìm thấy trận đấu");
      const screen = await ScreenService.create(input);
      if (!screen) {
        throw new Error(`Thêm màn hình thành công`);
      }
      logger.info(`Thêm màn hình thành công`);
      res.json(successResponse(screen, `Thêm màn hình thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const input: UpdateScreenInput = req.body;
      const id = Number(req.params.id);
      const screen = await ScreenService.update(id, input);
      if (!screen) throw new Error(` Cập nhật màn hình thất bại`);
      logger.info(`Cập nhật màn hình thành công`);
      res.json(successResponse(screen, `Cập nhật màn hình thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const screen = await ScreenService.getBy({ id: Number(id) });
      if (!screen) {
        throw new Error("Không tìm thấy màn hình ");
      }
      const deletescreen = await ScreenService.delete(screen.id);
      if (!deletescreen) {
        throw new Error(`Xóa màn hình thất bại `);
      }
      logger.info(`Xóa màn hình thành công`);
      res.json(successResponse(null, `Xóa màn hình thành công`));
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
        const screen = await ScreenService.getBy({ id: Number(id) });
        if (!screen) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy màn hình với ID = ${id}`,
          });
          continue;
        }

        const deleted = await ScreenService.delete(screen.id);

        if (!deleted) {
          messages.push({
            status: "error",
            msg: `Xóa màn hình thất bại`,
          });
          continue;
        }
        messages.push({
          status: "success",
          msg: `Xóa màn hình thành công`,
        });
        logger.info(`Xóa màn hình thành công`);
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

  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const query: ScreenQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        matchId: parseInt(req.query.matchId as string) || undefined,
      };
      const data = await ScreenService.getAlls(query);
      if (!data) {
        throw new Error("Không tìm thấy màn hình ");
      }
      logger.info(`Lấy danh sách màn hình thành công`);
      res.json(
        successResponse(
          { screens: data.screens, pagination: data.pagination },
          "Lấy danh màn hình thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}

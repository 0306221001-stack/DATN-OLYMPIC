import { Request, Response } from "express";
import {
  MediaService,
  CreateMediaInput,
  MediaQueryInput,
} from "@/modules/media";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";
import { Contestervice } from "@/modules/contest";

import {
  prepareFileInfoCustom,
  moveUploadedFile,
  deleteFile,
  ensureFolderExists,
} from "@/utils/uploadFile";

import { Media } from "@prisma/client";
import path from "path";
import { query } from "winston";

export default class mediaController {
  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const query: MediaQueryInput = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        type: req.query.type as "logo" | "background" | "images" | undefined,
      };

      const contest = await Contestervice.getBy({ slug: slug });
      if (!contest) throw new Error("Không tìm thấy cuộc thi");
      const medias = await MediaService.getAll(query, contest.id);

      logger.info(`Lấy danh sách media thành công`);
      res.json(
        successResponse(
          { medias: medias.medias, pagination: medias.pagination },
          "Lấy danh sách media thành công"
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
      const media = await MediaService.getBy({ id: Number(id) });
      if (!media) {
        throw new Error("Không tìm thấy media ");
      }
      logger.info(`Lấy thông tin media thành công`);
      res.json(successResponse(media, `Lấy thông tin media thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const input: Omit<CreateMediaInput, "url" | "contestId"> = req.body;
      const slug = await req.params.slug;
      const contest = await prisma.contest.findFirst({
        where: { slug: slug },
      });

      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi");
      }

      if (input.type === "background") {
        const existLogo = await prisma.media.findFirst({
          where: {
            type: "background",
            contestId: contest.id,
          },
        });

        if (existLogo) {
          throw new Error(
            "Cuộc thi này đã có background. Không thể thêm background mới."
          );
        }
      }

      if (input.type === "logo") {
        const existLogo = await prisma.media.findFirst({
          where: {
            type: "logo",
            contestId: contest.id,
          },
        });

        if (existLogo) {
          throw new Error("Cuộc thi này đã có logo. Không thể thêm logo mới.");
        }
      }
      if (!req.file) throw new Error(`Vui lòng upload file`);
      const file = req.file;

      const folderPath = path.resolve(process.cwd(), "uploads", "media");

      await ensureFolderExists(folderPath);
      const info = prepareFileInfoCustom(file, folderPath);
      console.log(info);
      const data = {
        url: `/uploads/media/${info.fileName}`,
        type: input.type,
        contestId: contest.id,
      };

      const media = await MediaService.create(data);
      if (!media) {
        throw new Error(`Thêm media thất bại`);
      }

      await moveUploadedFile(info.tempPath!, info.destPath!);
      logger.info(`Thêm media thành công`);
      res.json(successResponse(media, `Thêm media thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const media = await MediaService.getBy({ id: Number(id) });
      if (!media) {
        throw new Error("Không tìm thấy media ");
      }
      const deleteMedia = await MediaService.delete(media.id);
      if (!deleteMedia) {
        throw new Error(`Xóa media thất bại `);
      }
      logger.info(`Xóa media thành công`);
      await deleteFile(media.url);
      res.json(successResponse(null, `Xóa media  thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const input: Omit<CreateMediaInput, "url" | "contestId"> = req.body;
      const id = Number(req.params.id);

      const mediaContest = await MediaService.getBy({ id });
      if (!mediaContest) throw new Error("Không tìm thấy media");

      if (input.type === "background") {
        const exist = await prisma.media.findFirst({
          where: {
            type: "background",
            contestId: mediaContest.contestId,
            NOT: { id },
          },
        });
        if (exist) throw new Error("Cuộc thi này đã có background khác.");
      }

      if (input.type === "logo") {
        const exist = await prisma.media.findFirst({
          where: {
            type: "logo",
            contestId: mediaContest.contestId,
            NOT: { id },
          },
        });
        if (exist) throw new Error("Cuộc thi này đã có logo khác.");
      }

      let newUrl: string | undefined;

      if (req.file) {
        const folderPath = path.resolve(process.cwd(), "uploads", "media");
        const info = prepareFileInfoCustom(req.file, folderPath);
        await moveUploadedFile(info.tempPath!, info.destPath!);
        newUrl = `/uploads/media/${info.fileName}`;
      }

      const data: Partial<Media> = {
        type: input.type,
      };

      if (newUrl) {
        data.url = newUrl;
      }

      const updated = await MediaService.update(id, data);
      if (!updated) throw new Error("Cập nhật thất bại");

      if (newUrl && mediaContest.url) {
        await deleteFile(mediaContest.url);
      }

      console.log(mediaContest);

      logger.info("Cập nhật media thành công");
      res.json(successResponse(updated, "Cập nhật media thành công"));
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
        const media = await MediaService.getBy({ id: Number(id) });
        if (!media) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy media với ID = ${id}`,
          });
          continue;
        }
        const deleted = await MediaService.delete(media.id);
        if (!deleted) {
          messages.push({
            status: "error",
            msg: `Xóa media thất bại`,
          });
          continue;
        }

        messages.push({
          status: "success",
          msg: `Xóa media thành công`,
        });
        logger.info(`Xóa media thành công`);
        await deleteFile(media.url);
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
}

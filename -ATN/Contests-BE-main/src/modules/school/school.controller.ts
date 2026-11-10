import { Request, Response } from "express";
import {
  SchoolService,
  CreateSchoolInput,
  UpdateShoolInput,
  SchoolQueryInput,
} from "@/modules/school";
import { log } from "console";
import { validateData } from "@/middlewares/validation";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { string } from "zod";
export default class SchoolController {
  static async createSchool(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateSchoolInput = req.body;
      const existingEmail = await SchoolService.existingEmail(input.email);
      if (existingEmail) {
        res.status(400).json(validateData("email", "Email đã tồn tại"));
        return;
      }
      const existingPhone = await SchoolService.existingPhone(input.phone);
      if (existingPhone) {
        res.status(400).json(validateData("phone", "Số điện thoại đã tồn tại"));
        return;
      }
      const school = await SchoolService.createSchool(input);
      if (!school) {
        throw new Error("Thêm trường thất bại");
      }
      logger.info(`Thêm trường ${input.name} thành công`);
      res.json(successResponse(school, "Thêm trường thành công"));
    } catch (error) {
      log((error as Error).message);
      res.status(400).json({ error: (error as Error).message });
    }
  }
  static async getSchoolById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const school = await SchoolService.getSchoolBy({ id: Number(id) });
      if (!school) {
        throw new Error("Không tìm thấy trường học ");
      }
      logger.info(`Lấy thông tin trường ${school.name} thành công`);
      res.json(
        successResponse(
          school,
          `Lấy thông tin trường ${school.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async updateShool(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const input: UpdateShoolInput = req.body;
      const school = await SchoolService.getSchoolBy({ id: Number(id) });
      if (!school) {
        throw new Error("Không tìm thấy trường học ");
      }
      if (input.email) {
        const existingEmail = await SchoolService.existingEmailForUpdate(
          input.email,
          school.id
        );
        if (existingEmail) {
          res.status(400).json(validateData("email", "Email đã tồn tại"));
          return;
        }
      }
      if (input.phone) {
        const existingPhone = await SchoolService.existingPhoneForUpdate(
          input.phone,
          school.id
        );
        if (existingPhone) {
          res
            .status(400)
            .json(validateData("phone", "Số điện thoại đã tồn tại"));
          return;
        }
      }
      const schoolUpdate = await SchoolService.updateSchool(Number(id), input);
      if (!schoolUpdate) {
        throw new Error("Cập nhật trường thất bại ");
      }
      res.json(
        successResponse(
          schoolUpdate,
          `Cập nhật thông tin trường  ${school.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const school = await SchoolService.getSchoolBy({ id: Number(id) });
      if (!school) {
        throw new Error("Không tìm thấy trường học ");
      }

      const schoolUpdate = await SchoolService.updateSchool(Number(id), {
        isActive: !school.isActive,
      });
      if (!schoolUpdate) {
        throw new Error("Cập nhật trạng thái trường thất bại ");
      }

      logger.info(`Cập nhật trạng thái trường  ${school.name} thành công`);
      res.json(
        successResponse(
          schoolUpdate,
          `Cập nhật trạng thái trường  ${school.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async deleteSchool(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const school = await SchoolService.getSchoolBy({ id: Number(id) });
      if (!school) {
        throw new Error("Không tìm thấy trường học ");
      }
      const countClass = await SchoolService.countClassBySchoolId(school.id);
      if (countClass > 0) {
        throw new Error(`Trường này hiện có ${countClass} lớp không thể xóa`);
      }
      const deleteShool = await SchoolService.deleteSchool(school.id);
      if (!deleteShool) {
        throw new Error(`Xóa trường ${school.name} thất bại `);
      }
      logger.info(`Xóa ${school.name} thành công`);
      res.json(successResponse(null, `Xóa ${school.name} thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const query: SchoolQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === "true"
            : undefined,
      };
      const data = await SchoolService.getAllShool(query);
      if (!data) {
        throw new Error("Không tìm thấy trường học ");
      }
      logger.info(`Lấy danh sách trường học thành công`);
      res.json(
        successResponse(
          { school: data.schools, pagination: data.pagination },
          "Lấy danh sách trường học thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async deleteSchools(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        throw new Error(`Danh sách không hợp lệ`);
      }

      const messages: { status: "success" | "error"; msg: string }[] = [];

      for (const id of ids) {
        const school = await SchoolService.getSchoolBy({ id: Number(id) });

        if (!school) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy trường học với ID = ${id}`,
          });
          continue;
        }

        const countClass = await SchoolService.countClassBySchoolId(school.id);
        if (countClass > 0) {
          messages.push({
            status: "error",
            msg: `Trường "${school.name}" có ${countClass} lớp, không thể xóa`,
          });
          continue;
        }

        const deletedSchool = await SchoolService.deleteSchool(school.id);
        if (!deletedSchool) {
          messages.push({
            status: "error",
            msg: `Xóa trường ${school.name} thất bại`,
          });
          continue;
        }

        messages.push({
          status: "success",
          msg: `Xóa trường ${school.name} thành công`,
        });
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
  static async listSchool(req: Request, res: Response): Promise<void> {
    try {
      const data = await SchoolService.listSchool();
      if (!data) {
        throw new Error("Không tìm thấy trường học ");
      }
      logger.info(`Lấy danh sách trường học thành công`);
      res.json(successResponse(data, "Lấy danh sách trường học thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}

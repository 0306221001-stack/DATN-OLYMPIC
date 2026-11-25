import { Request, Response } from "express";
import {
  ClassService,
  ClassQueryInput,
  CreateClassInput,
  UpdateClassInput,
} from "@/modules/class";
import { SchoolService } from "@/modules/school";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";
export default class ClassController {
  static async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const Class = await ClassService.getClassBy({ id: Number(id) });
      if (!Class) {
        throw new Error("Không tìm thấy lớp học ");
      }
      const updateClass = await ClassService.updateClass(Number(id), {
        isActive: !Class.isActive,
      });
      if (!updateClass) {
        throw new Error("Cập nhật trạng thái lớp thất bại ");
      }
      logger.info(`Cập nhật trạng thái lớp  ${Class.name} thành công`);
      res.json(
        successResponse(
          updateClass,
          `Cập nhật trạng thái lớp ${Class.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async deleteClass(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const Class = await ClassService.getClassBy({ id: Number(id) });
      if (!Class) {
        throw new Error("Không tìm thấy lớp học ");
      }
      const [countClassVieo, countStudent] = await Promise.all([
        ClassService.countClassVieoByClassId(Number(id)),
        ClassService.countClassStudentClassId(Number(id)),
      ]);

      if (countClassVieo > 0) {
        throw new Error(
          `Lớp này hiện có ${countClassVieo} video lớp tham gia cuộc thi không thể xóa`
        );
      }
      if (countStudent > 0) {
        throw new Error(
          `Lớp này hiện có ${countStudent} sinh viên không thể xóa `
        );
      }
      const deleteClass = await ClassService.deleteClass(Class.id);
      if (!deleteClass) {
        throw new Error(`Xóa lớp ${Class.name} thất bại `);
      }
      logger.info(`Xóa lớp ${Class.name} thành công`);
      res.json(successResponse(null, `Xóa lớp ${Class.name} thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async updateClass(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const input: UpdateClassInput = req.body;
      if (input.schoolId) {
        const school = await SchoolService.getSchoolBy({ id: input.schoolId });
        if (!school) {
          throw new Error("Không tìm thấy trường");
        }
      }
      const Class = await ClassService.getClassBy({ id: Number(id) });
      if (!Class) {
        throw new Error("Không tìm thấy lớp");
      }
      const updateClass = await ClassService.updateClass(Number(id), input);
      if (!updateClass) {
        throw new Error("Cập nhật lớp thất bại");
      }
      logger.info(`Cập nhật lớp  ${Class.name} thành công`);
      res.json(
        successResponse(updateClass, `Cập nhật lớp ${Class.name} thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async createClass(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateClassInput = req.body;
      const school = await SchoolService.getSchoolBy({ id: input.schoolId });
      if (!school) {
        throw new Error("Không tìm thấy trường");
      }
      const Class = await ClassService.createClass(input);
      if (!Class) {
        throw new Error(`Thêm lớp ${input.name} thành công`);
      }
      logger.info(`Thêm lớp ${input.name} thành công`);
      res.json(successResponse(Class, `Thêm lớp ${input.name} thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async getClassById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const Class = await ClassService.getClassBy({ id: Number(id) });
      if (!Class) {
        throw new Error("Không tìm thấy lớp học ");
      }
      logger.info(`Lấy thông tin lớp ${Class.name} thành công`);
      res.json(
        successResponse(Class, `Lấy thông tin lớp ${Class.name} thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const query: ClassQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        schoolId: parseInt(req.query.schoolId as string) || undefined,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === "true"
            : undefined,
      };
      const data = await ClassService.getAllClass(query);
      if (!data) {
        throw new Error("Không tìm thấy lớp học ");
      }
      logger.info(`Lấy danh sách lớp học thành công`);
      res.json(
        successResponse(
          { classes: data.classes, pagination: data.pagination },
          "Lấy danh sách lớp học thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async deleteClasses(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        throw new Error("Danh sách không hợp lệ");
      }

      const messages: { status: "success" | "error"; msg: string }[] = [];

      for (const id of ids) {
        const classData = await ClassService.getClassBy({ id: Number(id) });

        if (!classData) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy lớp với ID = ${id}`,
          });
          continue;
        }

        const [countVideo, countStudent] = await Promise.all([
          ClassService.countClassVieoByClassId(classData.id),
          ClassService.countClassStudentClassId(classData.id),
        ]);

        if (countVideo > 0) {
          messages.push({
            status: "error",
            msg: `Lớp "${classData.name}" có ${countVideo} video lớp tham gia cuộc thi, không thể xóa`,
          });
          continue;
        }

        if (countStudent > 0) {
          messages.push({
            status: "error",
            msg: `Lớp "${classData.name}" có ${countStudent} sinh viên, không thể xóa`,
          });
          continue;
        }

        const deleted = await ClassService.deleteClass(classData.id);
        if (!deleted) {
          messages.push({
            status: "error",
            msg: `Xóa lớp "${classData.name}" thất bại`,
          });
          continue;
        }

        messages.push({
          status: "success",
          msg: `Xóa lớp "${classData.name}" thành công`,
        });
        logger.info(`Xóa lớp ${classData.name} thành công`);
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

  static async getClassBySchoolId(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      let classes: any;

      // Nếu id không hợp lệ (không phải số), trả về tất cả lớp
      if (isNaN(Number(id))) {
        const classesRaw = await prisma.class.findMany({
          select: {
            id: true,
            name: true,
            school: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          where: {
            isActive: true,
          },
        });

        classes = classesRaw.map(key => ({
          id: key.id,
          name: key.name + " - " + key.school.name,
        }));

        logger.info("Lấy danh sách tất cả lớp thành công");
        res.json(
          successResponse(classes, "Lấy danh sách tất cả lớp thành công")
        );
        return;
      }
      const school = await prisma.school.findFirst({
        where: { id: Number(id) },
      });

      if (!school) throw new Error("Không tìm thấy trường");

      classes = await ClassService.getClassBySchoolId(school.id);

      logger.info("Lấy danh sách lớp thành công");
      res.json(successResponse(classes, "Lấy danh sách lớp thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async listClassesWithSchool(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const search = req.query.search as string;

      const classes = await ClassService.listClassesWithSchool(search);

      logger.info(`Lấy danh sách lớp với thông tin trường thành công`);
      res.json(successResponse(classes, "Lấy danh sách lớp thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async listClass(req: Request, res: Response): Promise<void> {
    try {
      const classes = await ClassService.listClass();
      if (!classes) {
        throw new Error("Không tìm thấy lớp học");
      }

      res.json(successResponse(classes, `Lấy danh sách lớp thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}

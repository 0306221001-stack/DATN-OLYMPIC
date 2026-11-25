import { Request, Response } from "express";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "@/utils/response";
import { logger } from "@/utils/logger";
import { CustomError } from "@/middlewares/errorHandler";
import { ERROR_CODES } from "@/constants/errorCodes";
import QuestionPackageService from "./questionPackage.service";
import {
  CreateQuestionPackageInput,
  UpdateQuestionPackageInput,
  QuestionPackageQueryInput,
  QuestionPackageIdInput,
  BatchDeleteQuestionPackagesInput,
} from "./questionPackage.schema";
import { prisma } from "@/config/database";
import { count } from "console";

export default class QuestionPackageController {
  /**
   * Create a new question package
   */
  static async createQuestionPackage(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const data: CreateQuestionPackageInput = req.body;

      // Check if name already exists
      const nameExists = await QuestionPackageService.nameExists(data.name);
      if (nameExists) {
        throw new CustomError(
          "Tên gói câu hỏi đã tồn tại",
          409,
          ERROR_CODES.DUPLICATE_ENTRY
        );
      }

      const questionPackage =
        await QuestionPackageService.createQuestionPackage(data);

      logger.info(
        `Question package created successfully: ${questionPackage.id}`,
        {
          questionPackageId: questionPackage.id,
          name: questionPackage.name,
        }
      );

      res
        .status(201)
        .json(successResponse(questionPackage, "Tạo gói câu hỏi thành công"));
    } catch (error) {
      logger.error("Error creating question package:", error);

      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Lỗi server khi tạo gói câu hỏi",
              ERROR_CODES.INTERNAL_SERVER_ERROR
            )
          );
      }
    }
  }

  /**
   * Get question package by ID
   */
  static async getQuestionPackageById(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Parse ID manually for consistent validation
      const idParam = req.params.id;
      const id = parseInt(idParam, 10);

      if (isNaN(id) || id <= 0) {
        throw new CustomError(
          "ID phải là số nguyên dương",
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      logger.info(`Getting question package by ID: ${id} (type: ${typeof id})`);
      const questionPackage =
        await QuestionPackageService.getQuestionPackageById(id);

      if (!questionPackage) {
        throw new CustomError(
          "Không tìm thấy gói câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      res
        .status(200)
        .json(
          successResponse(
            questionPackage,
            "Lấy thông tin gói câu hỏi thành công"
          )
        );
    } catch (error) {
      logger.error("Error getting question package by ID:", error);

      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Lỗi server khi lấy thông tin gói câu hỏi",
              ERROR_CODES.INTERNAL_SERVER_ERROR
            )
          );
      }
    }
  }

  /**
   * Update question package
   */
  static async updateQuestionPackage(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const idParam = req.params.id;
      const id = parseInt(idParam, 10);

      if (isNaN(id) || id <= 0) {
        throw new CustomError(
          "ID phải là số nguyên dương",
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const data: UpdateQuestionPackageInput = req.body;

      // Check if question package exists
      const exists = await QuestionPackageService.questionPackageExists(id);
      if (!exists) {
        throw new CustomError(
          "Không tìm thấy gói câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      // Check if name already exists (excluding current record)
      if (data.name) {
        const nameExists = await QuestionPackageService.nameExists(
          data.name,
          id
        );
        if (nameExists) {
          throw new CustomError(
            "Tên gói câu hỏi đã tồn tại",
            409,
            ERROR_CODES.DUPLICATE_ENTRY
          );
        }
      }

      const updatedQuestionPackage =
        await QuestionPackageService.updateQuestionPackage(id, data);

      logger.info(`Question package updated successfully: ${id}`, {
        questionPackageId: id,
        updates: data,
      });

      res
        .status(200)
        .json(
          successResponse(
            updatedQuestionPackage,
            "Cập nhật gói câu hỏi thành công"
          )
        );
    } catch (error) {
      logger.error("Error updating question package:", error);

      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Lỗi server khi cập nhật gói câu hỏi",
              ERROR_CODES.INTERNAL_SERVER_ERROR
            )
          );
      }
    }
  }

  /**
   * Soft delete question package
   */
  static async deleteQuestionPackage(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const idParam = req.params.id;
      const id = parseInt(idParam, 10);

      if (isNaN(id) || id <= 0) {
        throw new CustomError(
          "ID phải là số nguyên dương",
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Check if question package exists
      const exists = await prisma.questionPackage.findUnique({
        where: { id },
      });
      if (!exists) {
        throw new CustomError(
          "Không tìm thấy gói câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      const questionDetailsCount = await prisma.questionDetail.count({
        where: { questionPackageId: id },
      });

      if (questionDetailsCount > 0) {
        throw new CustomError(
          `Gói câu hỏi ${exists.name} hiện có ${questionDetailsCount} câu không thể xóa`,
          400,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      const matchesCount = await prisma.match.count({
        where: { questionPackageId: id },
      });
      if (matchesCount > 0) {
        throw new CustomError(
          `Gói câu hỏi ${exists.name} hiện có ${matchesCount} trận đấu không thể xóa`,
          400,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      const deletedQuestionPackage =
        await QuestionPackageService.deleteQuestionPackage(id);

      if (!deletedQuestionPackage) {
        throw new CustomError(
          "Xóa câu hỏi thất bại",
          500,
          ERROR_CODES.INTERNAL_SERVER_ERROR
        );
      }

      logger.info(`Question package deleted successfully: ${id}`, {
        questionPackageId: id,
      });

      res.status(200).json(successResponse(null, "Xóa gói câu hỏi thành công"));
    } catch (error) {
      logger.error("Error deleting question package:", error);

      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Lỗi server khi xóa gói câu hỏi",
              ERROR_CODES.INTERNAL_SERVER_ERROR
            )
          );
      }
    }
  }

  /**
   * Get all question packages with pagination and filtering
   */
  static async getAllQuestionPackages(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Ensure proper validation and defaults
      const queryInput: QuestionPackageQueryInput = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
        search: req.query.search as string | undefined,
        isActive: req.query.isActive
          ? req.query.isActive === "true"
          : undefined,
        sortBy:
          (req.query.sortBy as "name" | "createdAt" | "updatedAt") ||
          "createdAt",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
      };

      const result = await QuestionPackageService.getAllQuestionPackages(
        queryInput
      );

      res
        .status(200)
        .json(
          paginatedResponse(
            result.questionPackages,
            result.pagination,
            "Lấy danh sách gói câu hỏi thành công"
          )
        );
    } catch (error) {
      logger.error("Error getting all question packages:", error);

      res
        .status(500)
        .json(
          errorResponse(
            "Lỗi server khi lấy danh sách gói câu hỏi",
            ERROR_CODES.INTERNAL_SERVER_ERROR
          )
        );
    }
  }
  /**
   * Get active question packages for dropdown
   */
  static async getActiveQuestionPackages(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const questionPackages =
        await QuestionPackageService.getActiveQuestionPackages();

      res
        .status(200)
        .json(
          successResponse(
            questionPackages,
            "Lấy danh sách gói câu hỏi hoạt động thành công"
          )
        );
    } catch (error) {
      logger.error("Error getting active question packages:", error);

      res
        .status(500)
        .json(
          errorResponse(
            "Lỗi server khi lấy danh sách gói câu hỏi hoạt động",
            ERROR_CODES.INTERNAL_SERVER_ERROR
          )
        );
    }
  }
  /**
   * Batch delete question packages
   */
  static async batchDeleteQuestionPackages(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const data: BatchDeleteQuestionPackagesInput = req.body;

      logger.info(
        `Attempting to batch delete ${data.ids.length} question packages`
      );

      const result = await QuestionPackageService.batchDeleteQuestionPackages(
        data
      );

      logger.info(
        `Batch delete completed: ${result.successful} successful, ${result.failed} failed`
      ); // Determine appropriate status code and message based on results
      let statusCode: number;
      let message: string;

      if (result.failed === 0) {
        // All items deleted successfully
        statusCode = 200;
        message = `Xóa hàng loạt thành công: ${result.successful}/${result.totalRequested} gói câu hỏi đã được xóa`;
        res.status(statusCode).json(successResponse(result, message));
      } else if (result.successful === 0) {
        // All items failed
        statusCode = 400;
        message = `Xóa hàng loạt thất bại: ${result.failed}/${result.totalRequested} gói câu hỏi không thể xóa`;
        res.status(statusCode).json({
          success: false,
          message: message,
          data: result,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Partial success - some succeeded, some failed
        statusCode = 207; // Multi-Status
        message = `Xóa hàng loạt hoàn tất một phần: ${result.successful}/${result.totalRequested} thành công, ${result.failed} thất bại`;
        res.status(statusCode).json(successResponse(result, message));
      }
    } catch (error) {
      logger.error("Error in batch delete question packages:", error);
      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
        return;
      }

      res
        .status(500)
        .json(
          errorResponse(
            "Lỗi server khi xóa hàng loạt gói câu hỏi",
            ERROR_CODES.INTERNAL_SERVER_ERROR
          )
        );
    }
  }
  static async getListQuestionPackage(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const id = req.params.id;
      const round = await QuestionPackageService.getListQuestionPackage();
      if (!round) {
        throw new Error("Không tìm thấy gói câu hỏi");
      }
      logger.info(`Lấy thông tin gói câu hỏi thành công`);
      res.json(successResponse(round, `Lấy danh sách gói câu hỏi thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const packages = await prisma.questionPackage.findUnique({
        where: { id: Number(id) },
      });
      if (!packages) {
        throw new Error("Không tìm thấy gói câu hỏi");
      }
      const updated = await QuestionPackageService.updateQuestionPackage(
        packages.id,
        {
          isActive: !packages.isActive,
        }
      );
      if (!updated) {
        throw new Error("Cập nhật trạng thái thất bại");
      }
      res.json(
        successResponse(updated, "Cập nhật trạng thái hoạt động thành công")
      );
      logger.info(`Cập nhật trạng thái hoạt động ${packages.name} thành công`);
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
        const packages = await prisma.questionPackage.findUnique({
          where: { id: Number(id) },
        });
        if (!packages) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy gói câu hỏi với ID = ${id}`,
          });
          continue;
        }

        const countQuestion = await prisma.questionDetail.count({
          where: { questionPackageId: packages.id },
        });

        if (countQuestion > 0) {
          messages.push({
            status: "error",
            msg: `Gói câu hỏi "${packages.name}" hiện có ${countQuestion} câu hỏi không thể xóa`,
          });
          continue;
        }

        const countMatch = await prisma.match.count({
          where: { questionPackageId: packages.id },
        });

        if (countMatch > 0) {
          messages.push({
            status: "error",
            msg: `Gói câu hỏi "${packages.name}" hiện có ${countMatch} trận đấu không thể xóa`,
          });
          continue;
        }

        const deleted = await prisma.match.delete({
          where: { id: packages.id },
        });
        if (!deleted) {
          messages.push({
            status: "error",
            msg: `Xóa gói câu hỏi "${packages.name}" thất bại`,
          });
          continue;
        }
        messages.push({
          status: "success",
          msg: `Xóa gói câu hỏi "${packages.name}" thành công`,
        });
        logger.info(`Xóa gói câu hỏi "${packages.name}" thành công`);
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

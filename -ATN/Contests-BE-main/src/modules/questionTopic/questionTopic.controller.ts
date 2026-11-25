import { Request, Response } from "express";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "@/utils/response";
import { logger } from "@/utils/logger";
import { CustomError } from "@/middlewares/errorHandler";
import { ERROR_CODES } from "@/constants/errorCodes";
import QuestionTopicService from "./questionTopic.service";
import {
  CreateQuestionTopicInput,
  UpdateQuestionTopicInput,
  QuestionTopicQueryInput,
  QuestionTopicIdInput,
  BatchDeleteQuestionTopicsInput,
} from "./questionTopic.schema";
import { prisma } from "@/config/database";

export default class QuestionTopicController {
  /**
   * Create a new question topic
   */
  static async createQuestionTopic(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateQuestionTopicInput = req.body;

      // Check if name already exists
      const nameExists = await QuestionTopicService.nameExists(data.name);
      if (nameExists) {
        throw new CustomError(
          "Tên chủ đề đã tồn tại",
          409,
          ERROR_CODES.DUPLICATE_ENTRY
        );
      }

      const questionTopic = await QuestionTopicService.createQuestionTopic(
        data
      );

      logger.info(`Question topic created successfully: ${questionTopic.id}`, {
        questionTopicId: questionTopic.id,
        name: questionTopic.name,
      });

      res
        .status(201)
        .json(successResponse(questionTopic, "Tạo chủ đề câu hỏi thành công"));
    } catch (error) {
      logger.error("Error creating question topic:", error);

      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Lỗi server khi tạo chủ đề câu hỏi",
              ERROR_CODES.INTERNAL_SERVER_ERROR
            )
          );
      }
    }
  }
  /**
   * Get question topic by ID
   */
  static async getQuestionTopicById(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Parse ID manually since we disabled middleware validation
      const idParam = req.params.id;
      const id = parseInt(idParam, 10);

      if (isNaN(id) || id <= 0) {
        throw new CustomError(
          "ID phải là số nguyên dương",
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      logger.info(`Getting question topic by ID: ${id} (type: ${typeof id})`);
      const questionTopic = await QuestionTopicService.getQuestionTopicById(id);

      if (!questionTopic) {
        throw new CustomError(
          "Không tìm thấy chủ đề câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      res
        .status(200)
        .json(
          successResponse(
            questionTopic,
            "Lấy thông tin chủ đề câu hỏi thành công"
          )
        );
    } catch (error) {
      logger.error("Error getting question topic by ID:", error);

      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Lỗi server khi lấy thông tin chủ đề câu hỏi",
              ERROR_CODES.INTERNAL_SERVER_ERROR
            )
          );
      }
    }
  }

  /**
   * Update question topic
   */ static async updateQuestionTopic(
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

      const data: UpdateQuestionTopicInput = req.body;

      // Check if question topic exists
      const exists = await QuestionTopicService.questionTopicExists(id);
      if (!exists) {
        throw new CustomError(
          "Không tìm thấy chủ đề câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      // Check if name already exists (excluding current record)
      if (data.name) {
        const nameExists = await QuestionTopicService.nameExists(data.name, id);
        if (nameExists) {
          throw new CustomError(
            "Tên chủ đề đã tồn tại",
            409,
            ERROR_CODES.DUPLICATE_ENTRY
          );
        }
      }

      const updatedQuestionTopic =
        await QuestionTopicService.updateQuestionTopic(id, data);

      logger.info(`Question topic updated successfully: ${id}`, {
        questionTopicId: id,
        updates: data,
      });

      res
        .status(200)
        .json(
          successResponse(
            updatedQuestionTopic,
            "Cập nhật chủ đề câu hỏi thành công"
          )
        );
    } catch (error) {
      logger.error("Error updating question topic:", error);

      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Lỗi server khi cập nhật chủ đề câu hỏi",
              ERROR_CODES.INTERNAL_SERVER_ERROR
            )
          );
      }
    }
  }

  /**
   * Soft delete question topic
   */ static async deleteQuestionTopic(
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

      // Check if question topic exists
      const exists = await QuestionTopicService.questionTopicExists(id);
      if (!exists) {
        throw new CustomError(
          "Không tìm thấy chủ đề câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      await QuestionTopicService.deleteQuestionTopic(id);

      logger.info(`Question topic deleted successfully: ${id}`, {
        questionTopicId: id,
      });

      res
        .status(200)
        .json(successResponse(null, "Xóa chủ đề câu hỏi thành công"));
    } catch (error) {
      logger.error("Error deleting question topic:", error);

      if (error instanceof CustomError) {
        res
          .status(error.statusCode)
          .json(errorResponse(error.message, error.code));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Lỗi server khi xóa chủ đề câu hỏi",
              ERROR_CODES.INTERNAL_SERVER_ERROR
            )
          );
      }
    }
  }
  /**
   * Get all question topics with pagination and filtering
   */
  static async getAllQuestionTopics(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Ensure proper validation and defaults
      const queryInput: QuestionTopicQueryInput = {
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

      const result = await QuestionTopicService.getAllQuestionTopics(
        queryInput
      );

      res
        .status(200)
        .json(
          paginatedResponse(
            result.questionTopics,
            result.pagination,
            "Lấy danh sách chủ đề câu hỏi thành công"
          )
        );
    } catch (error) {
      logger.error("Error getting all question topics:", error);

      res
        .status(500)
        .json(
          errorResponse(
            "Lỗi server khi lấy danh sách chủ đề câu hỏi",
            ERROR_CODES.INTERNAL_SERVER_ERROR
          )
        );
    }
  }
  /**
   * Get active question topics for dropdown
   */
  static async getActiveQuestionTopics(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const questionTopics =
        await QuestionTopicService.getActiveQuestionTopics();

      res
        .status(200)
        .json(
          successResponse(
            questionTopics,
            "Lấy danh sách chủ đề câu hỏi hoạt động thành công"
          )
        );
    } catch (error) {
      logger.error("Error getting active question topics:", error);

      res
        .status(500)
        .json(
          errorResponse(
            "Lỗi server khi lấy danh sách chủ đề câu hỏi hoạt động",
            ERROR_CODES.INTERNAL_SERVER_ERROR
          )
        );
    }
  }
  /**
   * Batch delete question topics
   */
  static async batchDeleteQuestionTopics(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const data: BatchDeleteQuestionTopicsInput = req.body;

      logger.info(
        `Attempting to batch delete ${data.ids.length} question topics`
      );

      const result = await QuestionTopicService.batchDeleteQuestionTopics(data);

      logger.info(
        `Batch delete completed: ${result.successful} successful, ${result.failed} failed`
      ); // Determine appropriate status code and message based on results
      let statusCode: number;
      let message: string;

      if (result.failed === 0) {
        // All items deleted successfully
        statusCode = 200;
        message = `Xóa hàng loạt thành công: ${result.successful}/${result.totalRequested} chủ đề câu hỏi đã được xóa`;
        res.status(statusCode).json(successResponse(result, message));
      } else if (result.successful === 0) {
        // All items failed
        statusCode = 400;
        message = `Xóa hàng loạt thất bại: ${result.failed}/${result.totalRequested} chủ đề câu hỏi không thể xóa`;
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
      logger.error("Error in batch delete question topics:", error);
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
            "Lỗi server khi xóa hàng loạt chủ đề câu hỏi",
            ERROR_CODES.INTERNAL_SERVER_ERROR
          )
        );
    }
  }
  static async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const topic = await prisma.questionTopic.findUnique({
        where: { id: Number(id) },
      });
      if (!topic) {
        throw new Error("Không tìm thấy chủ đề câu hỏi");
      }
      const updated = await prisma.questionTopic.update({
        where: { id: topic.id },
        data: { isActive: !topic.isActive },
      });
      if (!updated) {
        throw new Error("Cập nhật trạng thái thất bại");
      }

      res.json(
        successResponse(updated, "Cập nhật trạng thái hoạt động thành công")
      );
      logger.info(`Cập nhật trạng thái hoạt động ${topic.name} thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}

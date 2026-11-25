import { Request, Response } from "express";
import { logger } from "@/utils/logger";
import { CustomError } from "@/middlewares/errorHandler";
import { ERROR_CODES } from "@/constants/errorCodes";
import { prisma } from "@/config/database";
import QuestionDetailService from "./questionDetail.service";
import {
  CreateQuestionDetailInput,
  UpdateQuestionDetailInput,
  QuestionDetailQueryInput,
  BulkCreateQuestionDetailsInput,
  ReorderQuestionsInput,
  BatchDeleteQuestionDetailsInput,
  PackageQuestionsQueryInput,
  QuestionPackagesQueryInput,
  QuestionsNotInPackageQueryInput,
  SyncQuestionsInPackageInput,
} from "./questionDetail.schema";
import { successResponse, errorResponse, paginatedResponse } from "@/utils/response";

export default class QuestionDetailController {
  /**
   * Đồng bộ hóa danh sách câu hỏi trong một gói
   * @param req 
   * @param res 
   */
   static async syncQuestions(req: Request, res: Response): Promise<void> {
    try {
      const packageId = parseInt(req.params.packageId, 10);
      const data: SyncQuestionsInPackageInput = req.body;

      const result = await QuestionDetailService.syncQuestionsInPackage(packageId, data.questions);

      logger.info(`Successfully synchronized questions for package ${packageId}`, result);

      res.status(200).json(
        successResponse(
          result, 
          "Đồng bộ hóa danh sách câu hỏi trong gói thành công"
        )
      );
    } catch (error) {
      // Sử dụng handleErrorResponse đã có để xử lý lỗi nhất quán
      QuestionDetailController.handleErrorResponse(res, error);
    }
  }

  /**
   * Handle error response
   */
  private static handleErrorResponse(res: Response, error: unknown): void {
    logger.error("Error in QuestionDetailController:", error);
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: {
          code: error.code,
          details: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Lỗi server nội bộ",
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          details: "Đã xảy ra lỗi không mong muốn",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
  /**
   * Create a new question detail relationship
   */
  static async createQuestionDetail(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateQuestionDetailInput = req.body;

      // Check if question exists
      const questionExists = await QuestionDetailService.questionExists(data.questionId);
      if (!questionExists) {
        throw new CustomError(
          "Không tìm thấy câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      // Check if question package exists
      const packageExists = await QuestionDetailService.questionPackageExists(data.questionPackageId);
      if (!packageExists) {
        throw new CustomError(
          "Không tìm thấy gói câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      // Check if question detail already exists
      const exists = await QuestionDetailService.questionDetailExists(
        data.questionId,
        data.questionPackageId
      );
      if (exists) {
        throw new CustomError(
          "Câu hỏi đã tồn tại trong gói câu hỏi này",
          409,
          ERROR_CODES.DUPLICATE_ENTRY
        );
      }

      // Check if question order already exists
      const orderExists = await QuestionDetailService.questionOrderExists(
        data.questionPackageId,
        data.questionOrder
      );
      if (orderExists) {
        throw new CustomError(
          "Thứ tự câu hỏi đã tồn tại trong gói này",
          409,
          ERROR_CODES.DUPLICATE_ENTRY
        );
      }

      const questionDetail = await QuestionDetailService.createQuestionDetail(data);

      logger.info("Question detail created successfully", {
        questionId: questionDetail.questionId,
        questionPackageId: questionDetail.questionPackageId,
      });

      res.status(201).json({
        success: true,
        message: "Thêm câu hỏi vào gói thành công",
        data: questionDetail,
        timestamp: new Date().toISOString(),
      });    } catch (error) {
      logger.error("Error creating question detail:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            details: "Đã xảy ra lỗi không mong muốn",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Get question detail by composite key
   */
  static async getQuestionDetailById(req: Request, res: Response): Promise<void> {
    try {
      const questionIdParam = req.params.questionId;
      const questionPackageIdParam = req.params.questionPackageId;

      const questionId = parseInt(questionIdParam, 10);
      const questionPackageId = parseInt(questionPackageIdParam, 10);

      if (isNaN(questionId) || questionId <= 0) {
        throw new CustomError("ID câu hỏi phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      if (isNaN(questionPackageId) || questionPackageId <= 0) {
        throw new CustomError("ID gói câu hỏi phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const questionDetail = await QuestionDetailService.getQuestionDetailById(
        questionId,
        questionPackageId
      );

      if (!questionDetail) {
        throw new CustomError(
          "Không tìm thấy mối quan hệ câu hỏi-gói",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      res.status(200).json({
        success: true,
        message: "Lấy thông tin chi tiết câu hỏi thành công",
        data: questionDetail,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting question detail:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            details: "Đã xảy ra lỗi không mong muốn",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Update question detail
   */
  static async updateQuestionDetail(req: Request, res: Response): Promise<void> {
    try {
      const questionIdParam = req.params.questionId;
      const questionPackageIdParam = req.params.questionPackageId;
      const data: UpdateQuestionDetailInput = req.body;

      const questionId = parseInt(questionIdParam, 10);
      const questionPackageId = parseInt(questionPackageIdParam, 10);

      if (isNaN(questionId) || questionId <= 0) {
        throw new CustomError("ID câu hỏi phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      if (isNaN(questionPackageId) || questionPackageId <= 0) {
        throw new CustomError("ID gói câu hỏi phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // Check if question detail exists
      const exists = await QuestionDetailService.questionDetailExists(questionId, questionPackageId);
      if (!exists) {
        throw new CustomError(
          "Không tìm thấy mối quan hệ câu hỏi-gói",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }      // Check if new question order already exists (excluding current record)
      let swappedWith = null;
      if (data.questionOrder) {
        const existingQuestionDetail = await QuestionDetailService.getQuestionDetailByOrder(
          questionPackageId,
          data.questionOrder
        );
        
        // If another question has this order, swap their positions
        if (existingQuestionDetail && existingQuestionDetail.questionId !== questionId) {
          const swapResult = await QuestionDetailService.swapQuestionOrder(
            questionPackageId,
            questionId,
            existingQuestionDetail.questionId
          );
          
          swappedWith = {
            questionId: existingQuestionDetail.questionId,
            oldOrder: swapResult.updatedQuestion2.questionOrder,
            newOrder: swapResult.updatedQuestion1.questionOrder,
          };

          logger.info("Question order swapped successfully", {
            questionId,
            questionPackageId,
            swappedWithQuestionId: existingQuestionDetail.questionId,
            newOrder: data.questionOrder,
          });

          const message = swappedWith 
            ? `Cập nhật thứ tự câu hỏi thành công. Đã hoán đổi thứ tự với câu hỏi ID ${swappedWith.questionId}`
            : "Cập nhật chi tiết câu hỏi thành công";

          res.status(200).json({
            success: true,
            message,
            data: {
              updatedQuestionDetail: swapResult.updatedQuestion1,
              swappedWith,
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      // If no swap needed, proceed with normal update
      const updatedQuestionDetail = await QuestionDetailService.updateQuestionDetail(
        questionId,
        questionPackageId,
        data
      );

      logger.info("Question detail updated successfully", {
        questionId,
        questionPackageId,
      });

      res.status(200).json({
        success: true,
        message: "Cập nhật chi tiết câu hỏi thành công",
        data: {
          updatedQuestionDetail,
          swappedWith: null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error updating question detail:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            details: "Đã xảy ra lỗi không mong muốn",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Remove question from package (hard delete)
   */
  static async deleteQuestionDetail(req: Request, res: Response): Promise<void> {
    try {
      const questionIdParam = req.params.questionId;
      const questionPackageIdParam = req.params.questionPackageId;

      const questionId = parseInt(questionIdParam, 10);
      const questionPackageId = parseInt(questionPackageIdParam, 10);

      if (isNaN(questionId) || questionId <= 0) {
        throw new CustomError("ID câu hỏi phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      if (isNaN(questionPackageId) || questionPackageId <= 0) {
        throw new CustomError("ID gói câu hỏi phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // Check if question detail exists
      const exists = await QuestionDetailService.questionDetailExists(questionId, questionPackageId);
      if (!exists) {
        throw new CustomError(
          "Không tìm thấy mối quan hệ câu hỏi-gói",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      await QuestionDetailService.deleteQuestionDetail(questionId, questionPackageId);

      logger.info("Question detail deleted successfully", {
        questionId,
        questionPackageId,
      });

      res.status(200).json({
        success: true,
        message: "Xóa câu hỏi khỏi gói thành công",
        data: null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error deleting question detail:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            details: "Đã xảy ra lỗi không mong muốn",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Soft delete question detail (set isActive to false)
   */
  static async softDeleteQuestionDetail(req: Request, res: Response): Promise<void> {
    try {
      const questionIdParam = req.params.questionId;
      const questionPackageIdParam = req.params.questionPackageId;

      const questionId = parseInt(questionIdParam, 10);
      const questionPackageId = parseInt(questionPackageIdParam, 10);

      if (isNaN(questionId) || questionId <= 0) {
        throw new CustomError("ID câu hỏi phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      if (isNaN(questionPackageId) || questionPackageId <= 0) {
        throw new CustomError("ID gói câu hỏi phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // Check if question detail exists
      const exists = await QuestionDetailService.questionDetailExists(questionId, questionPackageId);
      if (!exists) {
        throw new CustomError(
          "Không tìm thấy mối quan hệ câu hỏi-gói",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      await QuestionDetailService.softDeleteQuestionDetail(questionId, questionPackageId);

      logger.info("Question detail soft deleted successfully", {
        questionId,
        questionPackageId,
      });

      res.status(200).json({
        success: true,
        message: "Vô hiệu hóa câu hỏi trong gói thành công",
        data: null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error soft deleting question detail:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            details: "Đã xảy ra lỗi không mong muốn",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
  /**
   * Get all question details with pagination and filtering
   */
  static async getAllQuestionDetails(req: Request, res: Response): Promise<void> {
    try {
      // Use validated query parameters from the validation middleware
      const queryInput: QuestionDetailQueryInput = (req as any).validatedQuery || req.query;

      const result = await QuestionDetailService.getAllQuestionDetails(queryInput);

      res.status(200).json({
        success: true,
        message: "Lấy danh sách chi tiết câu hỏi thành công",
        data: result.questionDetails,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting all question details:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            details: "Đã xảy ra lỗi không mong muốn",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }  /**
   * Get questions by package ID with ordering and pagination
   */
  static async getQuestionsByPackageId(req: Request, res: Response): Promise<void> {
    try {
      const packageIdParam = req.params.packageId;
      const packageId = parseInt(packageIdParam, 10);

      if (isNaN(packageId) || packageId <= 0) {
        throw new CustomError("ID gói câu hỏi phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // Check if package exists
      const packageExists = await QuestionDetailService.questionPackageExists(packageId);
      if (!packageExists) {
        throw new CustomError(
          "Không tìm thấy gói câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      // Use validated query parameters from middleware
      const queryInput: PackageQuestionsQueryInput = (req as any).validatedQuery || req.query;

      const result = await QuestionDetailService.getQuestionsByPackageId(
        packageId,
        queryInput
      );      res.status(200).json({
        success: true,
        message: "Lấy danh sách câu hỏi theo gói thành công",
        data: {
          packageInfo: result.packageInfo,
          questions: result.questions,
        },
        pagination: result.pagination,
        filters: result.filters,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting questions by package ID:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            details: "Đã xảy ra lỗi không mong muốn",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }  /**
   * Get packages by question ID with pagination
   */
  static async getPackagesByQuestionId(req: Request, res: Response): Promise<void> {
    try {
      const questionIdParam = req.params.questionId;
      const questionId = parseInt(questionIdParam, 10);

      if (isNaN(questionId) || questionId <= 0) {
        throw new CustomError("ID câu hỏi phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // Check if question exists
      const questionExists = await QuestionDetailService.questionExists(questionId);
      if (!questionExists) {
        throw new CustomError(
          "Không tìm thấy câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      // Use validated query parameters from middleware
      const queryInput: QuestionPackagesQueryInput = (req as any).validatedQuery || req.query;

      const result = await QuestionDetailService.getPackagesByQuestionId(
        questionId,
        queryInput
      );

      res.status(200).json({
        success: true,
        message: "Lấy danh sách gói theo câu hỏi thành công",
        data: {
          questionInfo: result.questionInfo,
          packages: result.packages,
        },
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting packages by question ID:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            details: "Đã xảy ra lỗi không mong muốn",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Bulk create question details
   */
  static async bulkCreateQuestionDetails(req: Request, res: Response): Promise<void> {
    try {
      const data: BulkCreateQuestionDetailsInput = req.body;

      // Check if question package exists
      const packageExists = await QuestionDetailService.questionPackageExists(data.questionPackageId);
      if (!packageExists) {
        throw new CustomError(
          "Không tìm thấy gói câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      // Validate all questions exist
      for (const question of data.questions) {
        const questionExists = await QuestionDetailService.questionExists(question.questionId);
        if (!questionExists) {
          throw new CustomError(
            `Không tìm thấy câu hỏi có ID: ${question.questionId}`,
            404,
            ERROR_CODES.RECORD_NOT_FOUND
          );
        }

        // Check if question already exists in package
        const questionDetailExists = await QuestionDetailService.questionDetailExists(
          question.questionId,
          data.questionPackageId
        );
        if (questionDetailExists) {
          throw new CustomError(
            `Câu hỏi ID ${question.questionId} đã tồn tại trong gói câu hỏi này`,
            409,
            ERROR_CODES.DUPLICATE_ENTRY
          );
        }
      }

      const questionDetails = await QuestionDetailService.bulkCreateQuestionDetails(data);

      logger.info("Bulk question details created successfully", {
        questionPackageId: data.questionPackageId,
        count: questionDetails.length,
      });

      res.status(201).json({
        success: true,
        message: `Thêm ${questionDetails.length} câu hỏi vào gói thành công`,
        data: questionDetails,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error bulk creating question details:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            details: "Đã xảy ra lỗi không mong muốn",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Reorder questions in a package
   */
  static async reorderQuestions(req: Request, res: Response): Promise<void> {
    try {
      const data: ReorderQuestionsInput = req.body;

      // Check if question package exists
      const packageExists = await QuestionDetailService.questionPackageExists(data.questionPackageId);
      if (!packageExists) {
        throw new CustomError(
          "Không tìm thấy gói câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      // Validate all question details exist
      for (const reorder of data.reorders) {
        const questionDetailExists = await QuestionDetailService.questionDetailExists(
          reorder.questionId,
          data.questionPackageId
        );
        if (!questionDetailExists) {
          throw new CustomError(
            `Không tìm thấy câu hỏi ID ${reorder.questionId} trong gói câu hỏi này`,
            404,
            ERROR_CODES.RECORD_NOT_FOUND
          );
        }
      }

      const updatedQuestionDetails = await QuestionDetailService.reorderQuestions(data);

      logger.info("Questions reordered successfully", {
        questionPackageId: data.questionPackageId,
        count: updatedQuestionDetails.length,
      });

      res.status(200).json({
        success: true,
        message: "Sắp xếp lại thứ tự câu hỏi thành công",
        data: updatedQuestionDetails,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error reordering questions:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            details: "Đã xảy ra lỗi không mong muốn",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Get question detail statistics
   */
  static async getQuestionDetailStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await QuestionDetailService.getQuestionDetailStats();

      res.status(200).json({
        success: true,
        message: "Lấy thống kê chi tiết câu hỏi thành công",
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting question detail stats:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            details: "Đã xảy ra lỗi không mong muốn",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Get next available question order for a package
   */
  static async getNextQuestionOrder(req: Request, res: Response): Promise<void> {
    try {
      const packageIdParam = req.params.packageId;
      const packageId = parseInt(packageIdParam, 10);

      if (isNaN(packageId) || packageId <= 0) {
        throw new CustomError("ID gói câu hỏi phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // Check if package exists
      const packageExists = await QuestionDetailService.questionPackageExists(packageId);
      if (!packageExists) {
        throw new CustomError(
          "Không tìm thấy gói câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      const nextOrder = await QuestionDetailService.getNextQuestionOrder(packageId);

      res.status(200).json({
        success: true,
        message: "Lấy thứ tự tiếp theo thành công",
        data: { nextOrder },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting next question order:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            details: "Đã xảy ra lỗi không mong muốn",
          },
          timestamp: new Date().toISOString(),
        });      }
    }
  }
  /**
   * Batch delete question details
   */
  static async batchDeleteQuestionDetails(req: Request, res: Response): Promise<void> {
    try {
      const data: BatchDeleteQuestionDetailsInput = req.body;

      logger.info(`Attempting to batch delete ${data.items.length} question details`);

      const result = await QuestionDetailService.batchDeleteQuestionDetails(data);

      logger.info(`Batch delete completed: ${result.successful} successful, ${result.failed} failed`);

      // Determine appropriate status code and message based on results
      let statusCode: number;
      let message: string;
      let success: boolean;

      if (result.failed === 0) {
        // All items deleted successfully
        statusCode = 200;
        success = true;
        message = `Xóa hàng loạt thành công: ${result.successful}/${result.totalRequested} mục đã được xóa`;
      } else if (result.successful === 0) {
        // All items failed
        statusCode = 400;
        success = false;
        message = `Xóa hàng loạt thất bại: ${result.failed}/${result.totalRequested} mục không thể xóa`;
      } else {
        // Partial success - some succeeded, some failed
        statusCode = 207; // Multi-Status
        success = true; // Consider partial success as overall success
        message = `Xóa hàng loạt hoàn tất một phần: ${result.successful}/${result.totalRequested} thành công, ${result.failed} thất bại`;
      }

      res.status(statusCode).json({
        success: success,
        message: message,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      QuestionDetailController.handleErrorResponse(res, error);
    }
  }

  /**
   * Hard delete question detail (explicit hard delete endpoint)
   */
  static async hardDeleteQuestionDetail(req: Request, res: Response): Promise<void> {
    try {
      const questionIdParam = req.params.questionId;
      const questionPackageIdParam = req.params.questionPackageId;

      const questionId = parseInt(questionIdParam, 10);
      const questionPackageId = parseInt(questionPackageIdParam, 10);

      if (isNaN(questionId) || questionId <= 0) {
        throw new CustomError("ID câu hỏi phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      if (isNaN(questionPackageId) || questionPackageId <= 0) {
        throw new CustomError("ID gói câu hỏi phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // Check if question detail exists
      const exists = await QuestionDetailService.questionDetailExists(questionId, questionPackageId);
      if (!exists) {
        throw new CustomError(
          "Không tìm thấy mối quan hệ câu hỏi-gói",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      // Check if this question detail is being used in any active matches
      const activeMatches = await prisma.contestantMatch.findFirst({
        where: {
          match: {
            questionPackage: {
              questionDetails: {
                some: {
                  questionId,
                  questionPackageId,
                },
              },
            },
            isActive: true,
            status: {
              in: ["upcoming", "ongoing"],
            },
          },
        },
      });      if (activeMatches) {
        throw new CustomError(
          "Không thể xóa chi tiết câu hỏi đang được sử dụng trong trận đấu đang hoạt động",
          409,
          ERROR_CODES.DUPLICATE_ENTRY
        );
      }

      await QuestionDetailService.deleteQuestionDetail(questionId, questionPackageId);

      logger.info("Question detail hard deleted successfully", {
        questionId,
        questionPackageId,
      });

      res.status(200).json({
        success: true,
        message: "Xóa vĩnh viễn câu hỏi khỏi gói thành công",
        data: null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error hard deleting question detail:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            details: "Đã xảy ra lỗi không mong muốn",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Normalize question orders in a package
   */
  static async normalizeQuestionOrders(req: Request, res: Response): Promise<void> {
    try {
      const packageIdParam = req.params.packageId;
      const packageId = parseInt(packageIdParam, 10);

      if (isNaN(packageId) || packageId <= 0) {
        throw new CustomError(
          "ID gói câu hỏi phải là số nguyên dương",
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Check if package exists
      const packageExists = await QuestionDetailService.questionPackageExists(packageId);
      if (!packageExists) {
        throw new CustomError(
          "Không tìm thấy gói câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      await QuestionDetailService.normalizeQuestionOrders(packageId);

      logger.info(`Question orders normalized successfully for package: ${packageId}`);

      res.status(200).json({
        success: true,
        message: "Sắp xếp lại thứ tự câu hỏi thành công",
        data: null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error normalizing question orders:", error);
      
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            details: "Đã xảy ra lỗi không mong muốn",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Get questions not in a specific package
   */
  static async getQuestionsNotInPackage(req: Request, res: Response): Promise<void> {
    try {
      const packageIdParam = req.params.packageId;
      const packageId = parseInt(packageIdParam, 10);

      if (isNaN(packageId) || packageId <= 0) {
        throw new CustomError("ID gói câu hỏi phải là số nguyên dương", 400, ERROR_CODES.VALIDATION_ERROR);
      }

      // Check if package exists
      const packageExists = await QuestionDetailService.questionPackageExists(packageId);
      if (!packageExists) {
        throw new CustomError(
          "Không tìm thấy gói câu hỏi",
          404,
          ERROR_CODES.RECORD_NOT_FOUND
        );
      }

      // Use validated query parameters from middleware
      const queryInput: QuestionsNotInPackageQueryInput = (req as any).validatedQuery || req.query;

      const result = await QuestionDetailService.getQuestionsNotInPackage(
        packageId,
        queryInput
      );

      res.status(200).json({
        success: true,
        message: "Lấy danh sách câu hỏi chưa có trong gói thành công",
        data: {
          packageInfo: result.packageInfo,
          questions: result.questions,
        },
        pagination: result.pagination,
        filters: result.filters,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error getting questions not in package:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Lỗi server nội bộ",
          error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            details: "Đã xảy ra lỗi không mong muốn",
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
}

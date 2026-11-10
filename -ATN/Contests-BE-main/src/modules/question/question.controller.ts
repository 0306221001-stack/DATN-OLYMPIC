import { Request, Response } from "express";
import { logger } from "@/utils/logger";
import { CustomError } from "@/middlewares/errorHandler";
import { ERROR_CODES } from "@/constants/errorCodes";
import { successResponse, errorResponse } from "@/utils/response";
import { QuestionService } from "./question.service";
import {
  CreateQuestionData,
  UpdateQuestionData,
  GetQuestionsQuery,
  BatchDeleteQuestionsData,
  UploadMediaData
} from "./question.schema";

export class QuestionController {
  private questionService: QuestionService;

  constructor() {
    this.questionService = new QuestionService();
  }
  /**
   * Get questions with pagination and filtering
   */
  async getQuestions(req: Request, res: Response): Promise<void> {
    try {
      // Parse query parameters with defaults
      const query: GetQuestionsQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: req.query.search as string || undefined,
        questionTopicId: req.query.questionTopicId ? parseInt(req.query.questionTopicId as string) : undefined,
        questionType: req.query.questionType as "multiple_choice" | "essay" || undefined,
        difficulty: req.query.difficulty as "Alpha" | "Beta" | "Rc" | "Gold" || undefined,
        hasMedia: req.query.hasMedia === "true" ? true : req.query.hasMedia === "false" ? false : undefined,
        isActive: req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined,
        sortBy: (req.query.sortBy as "createdAt" | "updatedAt" | "defaultTime" | "score") || "createdAt",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc"
      };

      const result = await this.questionService.getQuestions(query);

      logger.info(`Retrieved ${result.questions.length} questions`);
      res.json(successResponse(result, "Lấy danh sách câu hỏi thành công"));
    } catch (error) {
      logger.error("Error in getQuestions controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Get question by ID
   */
  async getQuestionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const question = await this.questionService.getQuestionById(Number(id));

      logger.info(`Retrieved question: ${question.id}`);
      res.json(successResponse(question, "Lấy thông tin câu hỏi thành công"));
    } catch (error) {
      logger.error("Error in getQuestionById controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Create new question
   */
  async createQuestion(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateQuestionData = req.body;
        // Handle uploaded files
      const uploadedFiles: { questionMedia?: Express.Multer.File[], mediaAnswer?: Express.Multer.File[] } = {};
      
      if (req.files) {
        if (Array.isArray(req.files)) {
          // Handle array of files (single field)
          uploadedFiles.questionMedia = req.files;
        } else {
          // Handle named fields
          if (req.files.questionMedia) {
            uploadedFiles.questionMedia = Array.isArray(req.files.questionMedia) 
              ? req.files.questionMedia 
              : [req.files.questionMedia];
          }
          if (req.files.mediaAnswer) {
            uploadedFiles.mediaAnswer = Array.isArray(req.files.mediaAnswer) 
              ? req.files.mediaAnswer 
              : [req.files.mediaAnswer];
          }
        }
        
        // Validate file sizes
        const allFiles: Express.Multer.File[] = [
          ...(uploadedFiles.questionMedia || []),
          ...(uploadedFiles.mediaAnswer || [])
        ];
        
        if (allFiles.length > 0) {
          const { validateFileSizes } = await import('./question.upload');
          try {
            validateFileSizes(allFiles);
          } catch (error) {
            // Clean up uploaded files if validation fails
            for (const file of allFiles) {
              try {
                const fs = await import('fs');
                if (fs.existsSync(file.path)) {
                  fs.unlinkSync(file.path);
                }
              } catch (cleanupError) {
                logger.error(`Failed to cleanup file ${file.path}:`, cleanupError);
              }
            }
            throw new CustomError((error as Error).message, 400, ERROR_CODES.VALIDATION_ERROR);
          }
        }
      }

      const question = await this.questionService.createQuestion(data, uploadedFiles);

      logger.info(`Question created successfully: ${question.id}`);
      res.status(201).json(successResponse(question, "Tạo câu hỏi thành công"));
    } catch (error) {
      logger.error("Error in createQuestion controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }  /**
   * Update question (PATCH method) with auto-merge files and delete support
   */
  async updateQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateQuestionData = req.body;
      
      console.log("=== DEBUG: updateQuestion Controller Started ===");
      console.log("Question ID:", id);
      console.log("Request body data:", JSON.stringify(data, null, 2));
      console.log("Request files:", req.files ? "Yes" : "No");
      
      // Get current question to merge with existing files
      const currentQuestion = await this.questionService.getQuestionById(Number(id));
      
      // Handle uploaded files
      const uploadedFiles: { questionMedia?: Express.Multer.File[], mediaAnswer?: Express.Multer.File[] } = {};
      
      if (req.files) {
        if (Array.isArray(req.files)) {
          uploadedFiles.questionMedia = req.files;
        } else {
          const files = req.files as { [fieldname: string]: Express.Multer.File[] };
          if (files.questionMedia) {
            uploadedFiles.questionMedia = Array.isArray(files.questionMedia) 
              ? files.questionMedia 
              : [files.questionMedia];
          }
          if (files.mediaAnswer) {
            uploadedFiles.mediaAnswer = Array.isArray(files.mediaAnswer) 
              ? files.mediaAnswer 
              : [files.mediaAnswer];
          }
        }
        
        // Validate file sizes
        const allFiles: Express.Multer.File[] = [
          ...(uploadedFiles.questionMedia || []),
          ...(uploadedFiles.mediaAnswer || [])
        ];
        
        if (allFiles.length > 0) {
          const { validateFileSizes } = await import('./question.upload');
          try {
            validateFileSizes(allFiles);
          } catch (error) {
            // Clean up uploaded files if validation fails
            for (const file of allFiles) {
              try {
                const fs = await import('fs');
                if (fs.existsSync(file.path)) {
                  fs.unlinkSync(file.path);
                }
              } catch (cleanupError) {
                logger.error(`Failed to cleanup file ${file.path}:`, cleanupError);
              }
            }
            throw new CustomError((error as Error).message, 400, ERROR_CODES.VALIDATION_ERROR);
          }
        }
      }

      // Parse delete requests from body
      let filesToDeleteFromQuestionMedia: string[] = [];
      let filesToDeleteFromMediaAnswer: string[] = [];
      
      if (data.deleteQuestionMedia) {
        if (typeof data.deleteQuestionMedia === 'string') {
          try {
            // Thử parse JSON nếu là string
            const parsed = JSON.parse(data.deleteQuestionMedia);
            // Nếu kết quả là array, sử dụng nó
            if (Array.isArray(parsed)) {
              filesToDeleteFromQuestionMedia = parsed;
            } else {
              // Nếu không phải array, đưa vào array
              filesToDeleteFromQuestionMedia = [parsed];
            }
          } catch {
            // Nếu không parse được, sử dụng giá trị nguyên bản
            filesToDeleteFromQuestionMedia = [data.deleteQuestionMedia];
          }
        } else if (Array.isArray(data.deleteQuestionMedia)) {
          // Xử lý từng phần tử trong mảng để đảm bảo định dạng đúng
          filesToDeleteFromQuestionMedia = data.deleteQuestionMedia.map(item => {
            if (typeof item === 'string') {
              try {
                // Thử parse nếu item là JSON string
                const parsed = JSON.parse(item);
                return typeof parsed === 'string' ? parsed : item;
              } catch {
                return item;
              }
            }
            return String(item);
          });
        }
      }
      
      if (data.deleteMediaAnswer) {
        if (typeof data.deleteMediaAnswer === 'string') {
          try {
            // Thử parse JSON nếu là string
            const parsed = JSON.parse(data.deleteMediaAnswer);
            // Nếu kết quả là array, sử dụng nó
            if (Array.isArray(parsed)) {
              filesToDeleteFromMediaAnswer = parsed;
            } else {
              // Nếu không phải array, đưa vào array
              filesToDeleteFromMediaAnswer = [parsed];
            }
          } catch {
            // Nếu không parse được, sử dụng giá trị nguyên bản
            filesToDeleteFromMediaAnswer = [data.deleteMediaAnswer];
          }
        } else if (Array.isArray(data.deleteMediaAnswer)) {
          // Xử lý từng phần tử trong mảng để đảm bảo định dạng đúng
          filesToDeleteFromMediaAnswer = data.deleteMediaAnswer.map(item => {
            if (typeof item === 'string') {
              try {
                // Thử parse nếu item là JSON string
                const parsed = JSON.parse(item);
                return typeof parsed === 'string' ? parsed : item;
              } catch {
                return item;
              }
            }
            return String(item);
          });
        }
      }

      console.log('Files to delete from questionMedia:', filesToDeleteFromQuestionMedia);
      console.log('Files to delete from mediaAnswer:', filesToDeleteFromMediaAnswer);

      // Auto-merge logic: Start with existing files, remove deleted ones, then add new ones
      let finalQuestionMedia = [...(currentQuestion.questionMedia || [])];
      let finalMediaAnswer = [...(currentQuestion.mediaAnswer || [])];
      
      // Remove files marked for deletion
      if (filesToDeleteFromQuestionMedia.length > 0) {
        finalQuestionMedia = finalQuestionMedia.filter(
          (media: any) => !filesToDeleteFromQuestionMedia.includes(media.filename)
        );
        logger.info(`Removing ${filesToDeleteFromQuestionMedia.length} files from questionMedia: ${filesToDeleteFromQuestionMedia.join(', ')}`);
      }
      
      if (filesToDeleteFromMediaAnswer.length > 0) {
        finalMediaAnswer = finalMediaAnswer.filter(
          (media: any) => !filesToDeleteFromMediaAnswer.includes(media.filename)
        );
        logger.info(`Removing ${filesToDeleteFromMediaAnswer.length} files from mediaAnswer: ${filesToDeleteFromMediaAnswer.join(', ')}`);
      }
      
      // Prepare clean data for service (remove delete fields)
      const { ...cleanData } = data as any;
      
      // Thêm thông tin về các file cần xóa
      if (filesToDeleteFromQuestionMedia.length > 0) {
        cleanData.deleteQuestionMedia = filesToDeleteFromQuestionMedia;
        cleanData.questionMedia = finalQuestionMedia.length > 0 ? finalQuestionMedia : null;
      }
      
      if (filesToDeleteFromMediaAnswer.length > 0) {
        cleanData.deleteMediaAnswer = filesToDeleteFromMediaAnswer;
        cleanData.mediaAnswer = finalMediaAnswer.length > 0 ? finalMediaAnswer : null;
      }

      logger.info(`Updating question with cleanData:`, {
        hasContent: !!cleanData.content,
        contentLength: cleanData.content?.length,
        hasQuestionMedia: !!cleanData.questionMedia,
        hasMediaAnswer: !!cleanData.mediaAnswer,
        otherFields: Object.keys(cleanData).filter(k => !['content', 'questionMedia', 'mediaAnswer'].includes(k))
      });

      // Xử lý file trước khi gọi updateQuestion để tránh xử lý hai lần
      let questionMedia: any[] | null = null;
      let mediaAnswer: any[] | null = null;

      // Process and add new files
      if (uploadedFiles.questionMedia && uploadedFiles.questionMedia.length > 0) {
        const newQuestionMedia = await this.questionService['processMediaFiles'](uploadedFiles.questionMedia);
        finalQuestionMedia.push(...newQuestionMedia);
        questionMedia = finalQuestionMedia;
        logger.info(`Adding ${newQuestionMedia.length} new files to questionMedia`);
      }
      
      if (uploadedFiles.mediaAnswer && uploadedFiles.mediaAnswer.length > 0) {
        const newMediaAnswer = await this.questionService['processMediaFiles'](uploadedFiles.mediaAnswer);
        finalMediaAnswer.push(...newMediaAnswer);
        mediaAnswer = finalMediaAnswer;
        logger.info(`Adding ${newMediaAnswer.length} new files to mediaAnswer`);
      }

      // Cập nhật cleanData với media đã xử lý
      if (questionMedia !== null) {
        cleanData.questionMedia = questionMedia;
      }
      
      if (mediaAnswer !== null) {
        cleanData.mediaAnswer = mediaAnswer;
      }

      // Gọi updateQuestion không có uploadedFiles để tránh xử lý file hai lần
      console.log("=== DEBUG: Calling questionService.updateQuestion ===");
      const question = await this.questionService.updateQuestion(Number(id), cleanData);

      console.log("=== DEBUG: Service updateQuestion completed ===");
      console.log("Final response data:", {
        id: question.id,
        questionMediaCount: (question.questionMedia as any)?.length || 0,
        mediaAnswerCount: (question.mediaAnswer as any)?.length || 0,
        hasQuestionMedia: !!(question.questionMedia as any),
        hasMediaAnswer: !!(question.mediaAnswer as any),
      });

      logger.info(`Question updated successfully with auto-merge and delete: ${question.id}`);
      logger.info(`QuestionMedia: ${filesToDeleteFromQuestionMedia.length} deleted, ${uploadedFiles.questionMedia?.length || 0} added`);
      logger.info(`MediaAnswer: ${filesToDeleteFromMediaAnswer.length} deleted, ${uploadedFiles.mediaAnswer?.length || 0} added`);
      
      console.log("=== DEBUG: Sending response to frontend ===");
      res.json(successResponse(question, "Cập nhật câu hỏi thành công"));
    } catch (error) {
      logger.error("Error in updateQuestion controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Soft delete question
   */
  async deleteQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.questionService.deleteQuestion(Number(id));

      logger.info(`Question soft deleted: ${id}`);
      res.json(successResponse(null, "Chuyển đổi trạng thái câu hỏi thành công"));
    } catch (error) {
      logger.error("Error in deleteQuestion controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Hard delete question
   */
  async hardDeleteQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.questionService.hardDeleteQuestion(Number(id));

      logger.info(`Question hard deleted: ${id}`);
      res.json(successResponse(null, "Xóa vĩnh viễn câu hỏi thành công"));
    } catch (error) {
      logger.error("Error in hardDeleteQuestion controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }

  /**
   * Batch delete questions
   */
  async batchDeleteQuestions(req: Request, res: Response): Promise<void> {
    try {
      const data: BatchDeleteQuestionsData = req.body;
      const result = await this.questionService.batchDeleteQuestions(data.ids, data.hardDelete);

      const { successIds, failedIds, errors } = result;

      if (failedIds.length === 0) {
        // All deletions successful
        const deleteType = data.hardDelete ? "xóa vĩnh viễn" : "xóa";
        logger.info(`Batch delete successful: ${successIds.length} questions deleted (hard: ${data.hardDelete})`);
        res.json(successResponse(result, `${deleteType} thành công ${successIds.length} câu hỏi`));
      } else if (successIds.length === 0) {
        // All deletions failed
        logger.warn(`Batch delete failed: All ${failedIds.length} deletions failed`);
        res.status(400).json(errorResponse("Không thể xóa bất kỳ câu hỏi nào", { result, errors }));
      } else {
        // Partial success
        const deleteType = data.hardDelete ? "xóa vĩnh viễn" : "xóa";
        logger.warn(`Batch delete partial: ${successIds.length} success, ${failedIds.length} failed (hard: ${data.hardDelete})`);
        res.status(207).json(successResponse(result, `${deleteType} thành công ${successIds.length}/${data.ids.length} câu hỏi`));
      }
    } catch (error) {
      logger.error("Error in batchDeleteQuestions controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }
  /**
   * Upload media for existing question
   */
  async uploadMediaForQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      // Default to questionMedia if not specified
      const mediaType = req.body.mediaType || 'questionMedia';
      
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        res.status(400).json(errorResponse("Không có file nào được upload", "VALIDATION_ERROR"));
        return;
      }

      const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
      
      const result = await this.questionService.uploadMediaForQuestion(
        Number(id), 
        mediaType as 'questionMedia' | 'mediaAnswer', 
        files as Express.Multer.File[]
      );

      logger.info(`Media uploaded for question ${id}, type: ${mediaType}`);
      res.json(successResponse(result, "Upload media thành công"));
    } catch (error) {
      logger.error("Error in uploadMediaForQuestion controller:", error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json(errorResponse(error.message, error.code));
      } else {
        res.status(500).json(errorResponse("Lỗi hệ thống", ERROR_CODES.INTERNAL_SERVER_ERROR));
      }
    }
  }
}

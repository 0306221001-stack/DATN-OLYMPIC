import { Router } from "express";
import { QuestionController } from "./question.controller";
import { authenticate } from "@/middlewares/auth";
import { role } from "@/middlewares/auth";
import { validateBody, validateParams, validateQuery } from "@/utils/validation";
import { handleUploadError } from "@/middlewares/multer/uploadErrorHandler";
import {
  createQuestionSchema,
  updateQuestionSchema,
  getQuestionByIdSchema,
  deleteQuestionSchema,
  hardDeleteQuestionSchema,
  getQuestionsQuerySchema,
  batchDeleteQuestionsSchema,
  uploadMediaSchema
} from "./question.schema";
import { questionMediaUpload } from "./question.upload";

const router = Router();
const questionController = new QuestionController();

// Media upload middleware with error handling
const handleMediaUpload = (uploadMiddleware: any) => {
  return [
    (req: any, res: any, next: any) => {
      uploadMiddleware(req, res, (error: any) => {
        if (error) {
          return handleUploadError(error, req, res, next);
        }
        next();
      });
    }
  ];
};

/**
 * @route GET /api/questions
 * @desc Get questions with pagination and filtering
 * @access Private (Admin/Judge) - trả về cả đáp án nên không được để công khai
 */
router.get(
  "/",
  authenticate,
  role("Admin", "Judge"),
  validateQuery(getQuestionsQuerySchema), // Temporarily disabled for testing
  questionController.getQuestions.bind(questionController)
);

/**
 * @route GET /api/questions/:id
 * @desc Get question by ID
 * @access Private (Admin/Judge) - trả về cả đáp án nên không được để công khai
 */
router.get(
  "/:id",
  authenticate,
  role("Admin", "Judge"),
  validateParams(getQuestionByIdSchema),
  questionController.getQuestionById.bind(questionController)
);

/**
 * @route POST /api/questions
 * @desc Create new question
 * @access Private (Admin/Judge) - TEMPORARILY DISABLED AUTH FOR TESTING
 */
router.post(
  "/",
  authenticate,
  role("Admin", "Judge"),
  ...handleMediaUpload(questionMediaUpload.fields([
    { name: "questionMedia", maxCount: 10 },
    { name: "mediaAnswer", maxCount: 10 }
  ])),
  validateBody(createQuestionSchema),
  questionController.createQuestion.bind(questionController)
);

/**
 * @route PATCH /api/questions/:id
 * @desc Update question (partial update)
 * @access Private (Admin/Judge) - TEMPORARILY DISABLED AUTH FOR TESTING
 */
router.patch(
  "/:id",
  authenticate,
  role("Admin", "Judge"),
  validateParams(getQuestionByIdSchema),
  ...handleMediaUpload(questionMediaUpload.fields([
    { name: "questionMedia", maxCount: 10 },
    { name: "mediaAnswer", maxCount: 10 }
  ])),
  validateBody(updateQuestionSchema),
  questionController.updateQuestion.bind(questionController)
);

/**
 * @route DELETE /api/questions/batch
 * @desc Batch delete questions (hard delete)
 * @access Private (Admin only) - TEMPORARILY DISABLED AUTH FOR TESTING
 */
router.delete(
  "/batch",
  authenticate,
  role("Admin"),
  validateBody(batchDeleteQuestionsSchema),
  questionController.batchDeleteQuestions.bind(questionController)
);

/**
 * @route DELETE /api/questions/:id
 * @desc Soft delete question
 * @access Private (Admin/Judge) - TEMPORARILY DISABLED AUTH FOR TESTING
 */
router.put(
  "/:id",
  authenticate,
  role("Admin", "Judge"),
  validateParams(deleteQuestionSchema),
  questionController.deleteQuestion.bind(questionController)
);

/**
 * @route DELETE /api/questions/:id/hard
 * @desc Hard delete question
 * @access Private (Admin only) - TEMPORARILY DISABLED AUTH FOR TESTING
 */
router.delete(
  "/:id/hard",
  authenticate,
  role("Admin"),
  validateParams(hardDeleteQuestionSchema),
  questionController.hardDeleteQuestion.bind(questionController)
);

/**
 * @route POST /api/questions/:id/media
 * @desc Upload media for existing question
 * @access Private (Admin/Judge) - TEMPORARILY DISABLED AUTH FOR TESTING
 */
router.post(
  "/:id/media",
  authenticate,
  role("Admin", "Judge"),
  validateParams(getQuestionByIdSchema),
  ...handleMediaUpload(questionMediaUpload.multiple("media", 10)),
  questionController.uploadMediaForQuestion.bind(questionController)
);

export default router;

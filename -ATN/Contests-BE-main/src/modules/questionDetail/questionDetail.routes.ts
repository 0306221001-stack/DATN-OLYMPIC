import { Router } from "express";
import { validateBody, validateQuery, validateParams } from "@/middlewares/validation";
import QuestionDetailController from "./questionDetail.controller";
import { authenticate } from "@/middlewares/auth";
import {
  CreateQuestionDetailSchema,
  UpdateQuestionDetailSchema,
  QuestionDetailIdSchema,
  QuestionDetailQuerySchema,
  BulkCreateQuestionDetailsSchema,
  ReorderQuestionsSchema,
  BatchDeleteQuestionDetailsSchema,
  PackageQuestionsQuerySchema,
  QuestionPackagesQuerySchema,
  QuestionsNotInPackageQuerySchema,
  SyncQuestionsInPackageSchema
} from "./questionDetail.schema";

const questionDetailRouter = Router();

// Apply authentication middleware to all routes
questionDetailRouter.use(authenticate);

/**
 * @route PUT /api/question-details/package/:packageId/sync
 * @description Synchronize all questions (add, update, remove) in a package.
 * @access Private (Admin/Judge)
 */
questionDetailRouter.put(
  "/package/:packageId/sync",
  validateBody(SyncQuestionsInPackageSchema),
  QuestionDetailController.syncQuestions
);

/**
 * @route POST /api/question-details
 * @description Create a new question detail relationship (add question to package)
 * @access Private (Admin/Judge)
 */
questionDetailRouter.post(
  "/",
  validateBody(CreateQuestionDetailSchema),
  QuestionDetailController.createQuestionDetail
);

/**
 * @route GET /api/question-details
 * @description Get all question details with pagination and filtering
 * @access Private (Admin/Judge)
 */
questionDetailRouter.get(
  "/",
  validateQuery(QuestionDetailQuerySchema),
  QuestionDetailController.getAllQuestionDetails
);

/**
 * @route GET /api/question-details/stats
 * @description Get question detail statistics
 * @access Private (Admin/Judge)
 */
questionDetailRouter.get(
  "/stats",
  QuestionDetailController.getQuestionDetailStats
);

/**
 * @route POST /api/question-details/bulk
 * @description Bulk create question details (add multiple questions to package)
 * @access Private (Admin/Judge)
 */
questionDetailRouter.post(
  "/bulk",
  validateBody(BulkCreateQuestionDetailsSchema),
  QuestionDetailController.bulkCreateQuestionDetails
);

/**
 * @route PUT /api/question-details/reorder
 * @description Reorder questions in a package
 * @access Private (Admin/Judge)
 */
questionDetailRouter.put(
  "/reorder",
  validateBody(ReorderQuestionsSchema),
  QuestionDetailController.reorderQuestions
);

/**
 * @route GET /api/question-details/package/:packageId
 * @description Get questions by package ID with ordering and pagination
 * @access Private (Admin/Judge)
 */
questionDetailRouter.get(
  "/package/:packageId",
  validateQuery(PackageQuestionsQuerySchema),
  QuestionDetailController.getQuestionsByPackageId
);

/**
 * @route GET /api/question-details/package/:packageId/next-order
 * @description Get next available question order for a package
 * @access Private (Admin/Judge)
 */
questionDetailRouter.get(
  "/package/:packageId/next-order",
  QuestionDetailController.getNextQuestionOrder
);

/**
 * @route GET /api/question-details/question/:questionId
 * @description Get packages by question ID with pagination
 * @access Private (Admin/Judge)
 */
questionDetailRouter.get(
  "/question/:questionId",
  validateQuery(QuestionPackagesQuerySchema),
  QuestionDetailController.getPackagesByQuestionId
);

/**
 * @route GET /api/question-details/:questionId/:questionPackageId
 * @description Get question detail by composite key
 * @access Private (Admin/Judge)
 */
questionDetailRouter.get(
  "/:questionId/:questionPackageId",
  QuestionDetailController.getQuestionDetailById
);

/**
 * @route PUT /api/question-details/:questionId/:questionPackageId
 * @description Update question detail (order, active status)
 * @access Private (Admin/Judge)
 */
questionDetailRouter.put(
  "/:questionId/:questionPackageId",
  validateBody(UpdateQuestionDetailSchema),
  QuestionDetailController.updateQuestionDetail
);

/**
 * @route DELETE /api/question-details/:questionId/:questionPackageId
 * @description Remove question from package (hard delete)
 * @access Private (Admin/Judge)
 */
questionDetailRouter.delete(
  "/:questionId/:questionPackageId",
  QuestionDetailController.deleteQuestionDetail
);

/**
 * @route DELETE /api/question-details/:questionId/:questionPackageId/hard
 * @description Hard delete question detail (explicit hard delete endpoint)
 * @access Private (Admin/Judge)
 */
questionDetailRouter.delete(
  "/:questionId/:questionPackageId/hard",
  QuestionDetailController.hardDeleteQuestionDetail
);

/**
 * @route PATCH /api/question-details/:questionId/:questionPackageId/deactivate
 * @description Soft delete question detail (set isActive to false)
 * @access Private (Admin/Judge)
 */
questionDetailRouter.patch(
  "/:questionId/:questionPackageId/deactivate",
  QuestionDetailController.softDeleteQuestionDetail
);

/**
 * @route POST /api/question-details/batch-delete
 * @description Batch delete question details
 * @access Private (Admin/Judge)
 */
questionDetailRouter.delete(
  "/batch-delete",
  validateBody(BatchDeleteQuestionDetailsSchema),
  QuestionDetailController.batchDeleteQuestionDetails
);

/**
 * @route PUT /api/question-details/package/:packageId/normalize-orders
 * @description Normalize question orders in a package (fill gaps, ensure sequential order)
 * @access Private (Admin/Judge)
 */
questionDetailRouter.put(
  "/package/:packageId/normalize-orders",
  QuestionDetailController.normalizeQuestionOrders
);

/**
 * @route GET /api/question-details/package/:packageId/available-questions
 * @description Get questions not in a specific package with pagination and filtering
 * @access Private (Admin/Judge)
 */
questionDetailRouter.get(
  "/package/:packageId/available-questions",
  validateQuery(QuestionsNotInPackageQuerySchema),
  QuestionDetailController.getQuestionsNotInPackage
);

export { questionDetailRouter };

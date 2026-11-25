import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { authenticate, role } from "@/middlewares/auth";
import QuestionTopicController from "./questionTopic.controller";
import {
  CreateQuestionTopicSchema,
  UpdateQuestionTopicSchema,
  QuestionTopicIdSchema,
  QuestionTopicQuerySchema,
  BatchDeleteQuestionTopicsSchema,
} from "./questionTopic.schema";

const questionRouter = Router();

// Apply authentication middleware to all routes
questionRouter.use(authenticate);
questionRouter.use(role("Admin"));

/**
 * @route POST /api/question-topics
 * @description Create a new question topic
 * @access Private (Admin/Judge)
 */
questionRouter.post(
  "/",
  validateBody(CreateQuestionTopicSchema),
  QuestionTopicController.createQuestionTopic
);

questionRouter.patch(
  "/:id/toggle-active",
  QuestionTopicController.toggleActive
);

/**
 * @route GET /api/question-topics
 * @description Get all question topics with pagination and filtering
 * @access Private (Admin/Judge)
 */
questionRouter.get(
  "/",
  validateQuery(QuestionTopicQuerySchema),
  QuestionTopicController.getAllQuestionTopics
);

/**
 * @route GET /api/question-topics/active
 * @description Get all active question topics (for dropdown)
 * @access Private (Admin/Judge)
 */
questionRouter.get("/active", QuestionTopicController.getActiveQuestionTopics);

/**
 * @route GET /api/question-topics/:id
 * @description Get question topic by ID
 * @access Private (Admin/Judge)
 */
questionRouter.get(
  "/:id",
  validateParams(QuestionTopicIdSchema),
  QuestionTopicController.getQuestionTopicById
);

/**
 * @route PUT /api/question-topics/:id
 * @description Update question topic
 * @access Private (Admin/Judge)
 */
questionRouter.put(
  "/:id",
  validateParams(QuestionTopicIdSchema),
  validateBody(UpdateQuestionTopicSchema),
  QuestionTopicController.updateQuestionTopic
);

/**
 * @route DELETE /api/question-topics/:id
 * @description Soft delete question topic
 * @access Private (Admin/Judge)
 */
questionRouter.patch(
  "/:id",
  validateParams(QuestionTopicIdSchema),
  QuestionTopicController.deleteQuestionTopic
);

/**
 * @route POST /api/question-topics/batch-delete
 * @description Batch delete question topics
 * @access Private (Admin/Judge)
 */
questionRouter.delete(
  "/batch-delete",
  validateBody(BatchDeleteQuestionTopicsSchema),
  QuestionTopicController.batchDeleteQuestionTopics
);

export default questionRouter;

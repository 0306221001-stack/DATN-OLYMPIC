import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { authenticate, role } from "@/middlewares/auth";
import QuestionPackageController from "./questionPackage.controller";
import {
  CreateQuestionPackageSchema,
  UpdateQuestionPackageSchema,
  QuestionPackageIdSchema,
  QuestionPackageQuerySchema,
  BatchDeleteQuestionPackagesSchema,
} from "./questionPackage.schema";

const questionPackageRouter = Router();

// Apply authentication middleware to all routes
questionPackageRouter.use(authenticate);
questionPackageRouter.use(role("Admin"));

/**
 * @route POST /api/question-packages
 * @description Create a new question package
 * @access Private (Admin/Judge)
 */
questionPackageRouter.post(
  "/",
  validateBody(CreateQuestionPackageSchema),
  QuestionPackageController.createQuestionPackage
);

/**
 * @route GET /api/question-packages
 * @description Get all question packages with pagination and filtering
 * @access Private (Admin/Judge)
 */
questionPackageRouter.get(
  "/",
  validateQuery(QuestionPackageQuerySchema),
  QuestionPackageController.getAllQuestionPackages
);

/**
 * @route GET /api/question-packages/active
 * @description Get all active question packages (for dropdown)
 * @access Private (Admin/Judge)
 */
questionPackageRouter.get(
  "/active",
  QuestionPackageController.getActiveQuestionPackages
);

/**
 * @route GET /api/question-packages/:id
 * @description Get question package by ID
 * @access Private (Admin/Judge)
 */

questionPackageRouter.get(
  "/get-question-package",
  QuestionPackageController.getListQuestionPackage
);

questionPackageRouter.get(
  "/:id",
  validateParams(QuestionPackageIdSchema),
  QuestionPackageController.getQuestionPackageById
);

/**
 * @route PUT /api/question-packages/:id
 * @description Update question package
 * @access Private (Admin/Judge)
 */
questionPackageRouter.put(
  "/:id",
  validateParams(QuestionPackageIdSchema),
  validateBody(UpdateQuestionPackageSchema),
  QuestionPackageController.updateQuestionPackage
);

/**
 * @route DELETE /api/question-packages/:id
 * @description Soft delete question package
 * @access Private (Admin/Judge)
 */
questionPackageRouter.patch(
  "/:id",
  validateParams(QuestionPackageIdSchema),
  QuestionPackageController.deleteQuestionPackage
);

/**
 * @route POST /api/question-packages/batch-delete
 * @description Batch delete question packages
 * @access Private (Admin/Judge)
 */
questionPackageRouter.delete(
  "/batch-delete",
  validateBody(BatchDeleteQuestionPackagesSchema),
  QuestionPackageController.batchDeleteQuestionPackages
);

questionPackageRouter.delete(
  "/:id",
  validateParams(QuestionPackageIdSchema),
  QuestionPackageController.deleteQuestionPackage
);

questionPackageRouter.patch(
  "/:id/toggle-active",
  validateParams(QuestionPackageIdSchema),
  QuestionPackageController.toggleActive
);

questionPackageRouter.post("/delete-many", QuestionPackageController.deletes);

export { questionPackageRouter };

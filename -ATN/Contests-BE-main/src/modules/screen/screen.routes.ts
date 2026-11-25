import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { ScreenController } from "@/modules/screen";
import {
  CreateScreenSchema,
  UpdateScreenSchema,
  ScreensIdShema,
  ScreenQuerySchema,
  deleteScreensSchema,
} from "./screen.schema";
import { authenticate, role } from "@/middlewares/auth";
const screenRouter = Router();
// prive

screenRouter.get(
  "/",
  authenticate,
  role("Admin"),
  validateQuery(ScreenQuerySchema),
  ScreenController.getAlls
);

screenRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ScreensIdShema),
  ScreenController.getById
);

screenRouter.post(
  "/",
  authenticate,
  role("Admin"),
  validateBody(CreateScreenSchema),
  ScreenController.create
);

screenRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdateScreenSchema),
  validateParams(ScreensIdShema),
  ScreenController.update
);

screenRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ScreensIdShema),
  ScreenController.delete
);

screenRouter.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteScreensSchema),
  ScreenController.deletes
);

export { screenRouter };

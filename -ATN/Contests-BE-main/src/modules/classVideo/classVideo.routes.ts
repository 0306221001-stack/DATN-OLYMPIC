import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import {
  ClassVideoIdSchema,
  deleteClassVideosSchema,
} from "./classVideo.schema";
import { ClassVideoController } from "@/modules/classVideo";
import { authenticate, role } from "@/middlewares/auth";
import { createMulter } from "@/utils/multer";
const classVideoRouter = Router();
const uploads = createMulter("ClassVideo");

// private

classVideoRouter.post(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  uploads.single("videos"),
  // validateBody(CreateClassVideoSchema),
  ClassVideoController.create
);

classVideoRouter.get(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  ClassVideoController.getAlls
);

classVideoRouter.get(
  "/contest/list-video/:slug",
  authenticate,
  role("Admin"),
  ClassVideoController.ClassVideosByContestSlug
);

classVideoRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  // validateQuery(ClassVideoIdSchema),
  ClassVideoController.getById
);

classVideoRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ClassVideoIdSchema),
  uploads.single("videos"),
  ClassVideoController.update
);

classVideoRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ClassVideoIdSchema),
  ClassVideoController.delete
);

classVideoRouter.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteClassVideosSchema),
  ClassVideoController.deletes
);

export { classVideoRouter };

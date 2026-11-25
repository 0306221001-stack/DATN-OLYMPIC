import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { MediaIdShame, deleteMediaesSchema } from "./media.schema";
import { MediaController } from "@/modules/media";
import { authenticate, role } from "@/middlewares/auth";
import { createMulter } from "@/utils/multer";
const mediaRouter = Router();
const uploads = createMulter("media");
// prive

mediaRouter.post(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  uploads.single("media"),
  MediaController.create
);

mediaRouter.get(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  MediaController.getAlls
);

mediaRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(MediaIdShame),
  MediaController.getById
);

mediaRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(MediaIdShame),
  uploads.single("media"),
  MediaController.update
);

mediaRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(MediaIdShame),
  MediaController.delete
);

mediaRouter.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteMediaesSchema),
  MediaController.deletes
);

export { mediaRouter };

import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { ClassController } from "@/modules/class";
import {
  ClassQuerySchema,
  CreateClassShema,
  ClassIdShame,
  UpdeateClasshema,
  deleteClassesSchema,
} from "./class.schema";
import { authenticate, role } from "@/middlewares/auth";
const classRouter = Router();

// public routes
classRouter.get("/list-with-school", ClassController.listClassesWithSchool);

classRouter.get(
  "/list-class",
  authenticate,
  role("Admin"),
  ClassController.listClass
);

classRouter.get(
  "/",
  authenticate,
  role("Admin"),
  // validateQuery(ClassQuerySchema),

  ClassController.getAlls
);

classRouter.get(
  "/school/:id",
  authenticate,
  role("Admin"),
  validateQuery(ClassQuerySchema),
  ClassController.getClassBySchoolId
);

classRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ClassIdShame),
  ClassController.getClassById
);

classRouter.post(
  "/",
  authenticate,
  role("Admin"),
  validateBody(CreateClassShema),
  ClassController.createClass
);

classRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdeateClasshema),
  validateParams(ClassIdShame),
  ClassController.updateClass
);

classRouter.patch(
  "/:id/toggle-active",
  authenticate,
  role("Admin"),
  ClassController.toggleActive
);
classRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ClassIdShame),
  ClassController.deleteClass
);

classRouter.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteClassesSchema),
  ClassController.deleteClasses
);

export { classRouter };

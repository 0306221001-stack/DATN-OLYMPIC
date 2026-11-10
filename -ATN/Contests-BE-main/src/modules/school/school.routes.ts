import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { SchoolController } from "@/modules/school";
import {
  CreateSchoolSchema,
  SchoolIdShame,
  SchoolQuerySchema,
  UpdeateSchoolShema,
  deleteSchoolsSchema,
} from "./school.schema";
import { authenticate, role } from "@/middlewares/auth";
const schoolRouter = Router();
// prive

schoolRouter.get(
  "/get-school",
  authenticate,
  role("Admin"),
  SchoolController.listSchool
);

schoolRouter.get(
  "/",
  authenticate,
  role("Admin"),
  validateQuery(SchoolQuerySchema),
  SchoolController.getAlls
);

schoolRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(SchoolIdShame),
  SchoolController.getSchoolById
);

schoolRouter.post(
  "/",
  authenticate,
  role("Admin"),
  validateBody(CreateSchoolSchema),
  SchoolController.createSchool
);

schoolRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdeateSchoolShema),
  SchoolController.updateShool
);
schoolRouter.patch(
  "/:id/toggle-active",
  authenticate,
  role("Admin"),
  SchoolController.toggleActive
);
schoolRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  SchoolController.deleteSchool
);

schoolRouter.post(
  "/delete-many",
  authenticate,
  validateBody(deleteSchoolsSchema),
  role("Admin"),
  SchoolController.deleteSchools
);

export { schoolRouter };

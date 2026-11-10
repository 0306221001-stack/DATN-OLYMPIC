import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { StudentController } from "@/modules/student";
import { StudentIdShame, deleteStudentsSchema } from "./student.schema";
import { authenticate, role } from "@/middlewares/auth";
import { createMulter } from "@/utils/multer";
import multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const uploads = createMulter("Student");
const studentRouter = Router();

// prive

studentRouter.get("/", authenticate, role("Admin"), StudentController.getAlls);

studentRouter.get(
  "/not-contest/:slug",
  authenticate,
  role("Admin"),
  // validateQuery(StudentQuerySchema),
  StudentController.getStudentNotContestId
);

studentRouter.patch(
  "/:id/toggle-active",
  authenticate,
  role("Admin"),
  StudentController.toggleActive
);

studentRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(StudentIdShame),
  StudentController.getStudentById
);

studentRouter.post(
  "/",
  authenticate,
  role("Admin"),
  uploads.single("avatar"),
  StudentController.createStudent
);

studentRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  uploads.single("avatar"),
  StudentController.updateStudent
);
studentRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(StudentIdShame),
  StudentController.deleteStudent
);

studentRouter.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteStudentsSchema),
  StudentController.deleteStudents
);

studentRouter.post(
  "/import/excel",
  authenticate,
  role("Admin"),
  upload.single("file"),
  StudentController.importExcel
);

export { studentRouter };

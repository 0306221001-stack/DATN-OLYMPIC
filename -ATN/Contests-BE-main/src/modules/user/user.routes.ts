import { Router } from "express";
import { authenticate, role } from "@/middlewares/auth";
import { UserController } from "@/modules/user";
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage() });

import {
  CreateUserSchema,
  UserIdShema,
  UserQuerySchema,
  deleteUsersSchema,
} from "./user.schema";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";

const userRouter = Router();
export { userRouter };
// Prive(schema)
userRouter.get(
  "/get-user",
  authenticate,
  role("Admin"),
  UserController.getListUser
);

userRouter.post(
  "/import/excel",
  authenticate,
  role("Admin"),
  upload.single("file"),
  UserController.importExcel
);

userRouter.get(
  "/get-student",
  authenticate,
  role("Admin"),
  UserController.getListStudent
);

userRouter.get(
  "/get-student/:userId",
  authenticate,
  role("Admin"),
  UserController.getListStudentCurrent
);

userRouter.get(
  "/:id",
  authenticate,
  validateParams(UserIdShema),
  role("Admin"),
  UserController.getUserById
);

userRouter.get(
  "/",
  authenticate,
  validateQuery(UserQuerySchema),
  role("Admin"),
  UserController.getAllUsers
);

userRouter.post(
  "/",
  validateBody(CreateUserSchema),
  authenticate,
  role("Admin"),
  UserController.creatUser
);

userRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  UserController.UpdateUser
);

userRouter.patch(
  "/:id/toggle-active",
  authenticate,
  role("Admin"),
  UserController.toggleActive
);

userRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(UserIdShema),
  UserController.deleteUser
);

userRouter.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteUsersSchema),
  UserController.deleteUsers
);

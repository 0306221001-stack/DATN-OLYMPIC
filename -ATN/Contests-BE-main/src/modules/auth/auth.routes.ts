import { Router } from "express";
import AuthController from "./auth.controller";
import { role } from "@/middlewares/auth";
import { validateBody } from "@/utils/validation";
import {
  LoginSchema,
  forgotPasswordSchema,
  otpShema,
  ResetPasswordShema,
  RegisterSchema,
  StudentRegisterSchema,
  ChangePassWordShema,
  ChangeInfoShema,
} from "./auth.schema";

import { authenticate } from "@/middlewares/auth";
const authRouter = Router();
// public
authRouter.post("/login", validateBody(LoginSchema), AuthController.login);
authRouter.post(
  "/student-login",
  validateBody(LoginSchema),
  AuthController.studentLogin
);
authRouter.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  AuthController.forgotPassword
);
authRouter.post(
  "/verify-otp",
  validateBody(otpShema),
  AuthController.verifyOtp
);
authRouter.post(
  "/reset-password",
  validateBody(ResetPasswordShema),
  AuthController.resetPassword
);
authRouter.post(
  "/register",
  validateBody(RegisterSchema),
  AuthController.register
);
authRouter.post(
  "/register-student",
  validateBody(StudentRegisterSchema),
  AuthController.registerStudent
);

// private
authRouter.post("/logout", authenticate, AuthController.logout);
authRouter.get("/refresh-token", AuthController.refreshAccToken);
authRouter.get("/abc", authenticate, (req, res) => {
  res.json("au");
});
authRouter.post(
  "/change-password",
  authenticate,
  validateBody(ChangePassWordShema),
  AuthController.changePassWord
);
authRouter.post(
  "/change-info",
  authenticate,
  validateBody(ChangeInfoShema),
  AuthController.changeInfo
);
authRouter.get(
  "/registration-number",
  authenticate,
  role("Student"),
  AuthController.getRegistrationNumber
);
authRouter.get("/profile", authenticate, AuthController.profile);
authRouter.get(
  "/profile-student",
  authenticate,
  role("Student"),
  AuthController.profileStudent
);
// Admin
authRouter.get("/admin", authenticate, role("Admin"), (req, res) => {
  res.json("Chào Admin");
});
// Judge
authRouter.get("/judge", authenticate, role("Judge"), (req, res) => {
  res.json("Chào Trọng tài ");
});
// Student - for socket connection testing
authRouter.get("/student", authenticate, role("Student"), (req, res) => {
  res.json({
    message: "Chào thí sinh",
    user: req.user,
    socketNamespace: "/match-control",
  });
});
export { authRouter };

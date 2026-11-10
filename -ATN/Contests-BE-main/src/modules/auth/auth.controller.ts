import dotenv from "dotenv";
dotenv.config();

import AuthService from "./auth.service";
import {
  LoginInput,
  forgotPasswordInput,
  OtpInput,
  ResetPasswordInput,
  RegisterInput,
  StudentRegisterInput,
  ChangePassWordInput,
  ChangeInfoInput,
} from "./auth.schema";
import { Request, Response } from "express";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { verifyToken, generateAccessToken } from "@/utils/jwt";
import UserService from "../user/user.service";
import { validateData } from "@/middlewares/validation";
import { sendOtp } from "@/utils/email";
import bcrypt from "bcrypt";

import { prisma } from "@/config/database";
import { ContestStatus } from "@prisma/client";
import { findCurrentContestantId } from "@/utils/currentContestant";

// Khớp với đồng hồ đếm ngược 120 giây trên app và web.
const OTP_TTL_MINUTES = 2;
const OTP_MAX_WRONG_ATTEMPTS = 5;
// Số lần nhập sai OTP theo email, để chặn dò mã 6 chữ số.
const otpWrongAttempts = new Map<string, number>();

// Ghi nhận một lần nhập sai; đủ số lần thì hủy mã để buộc gửi lại mã mới.
async function recordWrongOtp(userId: number, email: string): Promise<void> {
  const count = (otpWrongAttempts.get(email) ?? 0) + 1;
  if (count >= OTP_MAX_WRONG_ATTEMPTS) {
    otpWrongAttempts.delete(email);
    await UserService.UpdateUser(userId, {
      otpCode: null,
      otpExpiredAt: null,
    } as any);
    throw new Error("Nhập sai mã OTP quá nhiều lần, vui lòng gửi lại mã mới");
  }
  otpWrongAttempts.set(email, count);
}

export default class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const input: RegisterInput = req.body;
      const extingUserName = await UserService.existingUserName(input.username);
      if (extingUserName) {
        logger.error(`Tên tài khoản  ${input.username} đã tồn tại`);
        res
          .status(400)
          .json(validateData("username", "Tên tài khoản đã tồn tại"));
        return;
      }
      const extingEmail = await UserService.existingEmail(input.email);
      if (extingEmail) {
        logger.error(`Email ${input.email} đã tồn tại`);
        res.status(400).json(validateData("email", "Email đã tồn tại"));
        return;
      }
      const { confirmPassword, ...userInput } = input;
      const hashedPassword = await bcrypt.hash(userInput.password, 10);
      const user = await UserService.creatUser({
        ...userInput,
        password: hashedPassword,
      });
      res.json(successResponse(user, "Đăng kí tài khoản thành công"));
      logger.info(`Đăng kí tài khoản thành công ${user}`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async registerStudent(req: Request, res: Response): Promise<void> {
    try {
      const input: StudentRegisterInput = req.body;

      const result = await AuthService.registerStudent(input);

      res.json(
        successResponse(result, "Đăng ký tài khoản sinh viên thành công")
      );
      logger.info(
        `Đăng ký tài khoản sinh viên thành công cho ${input.username}`
      );
    } catch (error) {
      const errorMessage = (error as Error).message;

      // Xử lý các lỗi cụ thể
      switch (errorMessage) {
        case "USERNAME_EXISTS":
          logger.error(`Tên tài khoản ${req.body.username} đã tồn tại`);
          res
            .status(400)
            .json(validateData("username", "Tên tài khoản đã tồn tại"));
          break;
        case "EMAIL_EXISTS":
          logger.error(`Email ${req.body.email} đã tồn tại`);
          res.status(400).json(validateData("email", "Email đã tồn tại"));
          break;
        case "CLASS_NOT_EXISTS":
          logger.error(`Lớp với ID ${req.body.classId} không tồn tại`);
          res.status(400).json(validateData("classId", "Lớp không tồn tại"));
          break;
        default:
          logger.error((error as Error).message);
          res.status(400).json(errorResponse((error as Error).message));
          break;
      }
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const input: LoginInput = req.body;

      const user = await AuthService.findUserByIdentifier(input.identifier);
      if (!user) {
        logger.error(`Tài khoản ${input.identifier} không tồn tại`);
        throw new Error("Tài khoản hoặc mật khẩu không chính xác");
      }

      if (!user.isActive) {
        logger.error(`Tài khoản ${input.identifier} đã bị vô hiệu hóa`);
        throw new Error("Tài khoản đã bị vô hiệu hóa");
      }

      if (user.role === "Student") {
        throw new Error(
          "Vui lòng sử dụng endpoint /student/login để đăng nhập"
        );
      }

      const isPassword = await AuthService.isPassword(
        input.password,
        user.password
      );
      if (!isPassword) {
        throw new Error("Tài khoản hoặc mật khẩu không chính xác");
      }
      const tokenData = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      };
      const accessToken = await AuthService.accessToken(tokenData);
      const refreshToken = await AuthService.refreshToken(tokenData);
      const updateAccessToken: any = {};
      updateAccessToken.token = accessToken;
      await UserService.UpdateUser(user.id, updateAccessToken);
      const refreshTokenInput = {
        userId: user.id,
        refreshToken: refreshToken,
      };
      const deleterefreshToken = await prisma.refreshToken.deleteMany({
        where: {
          userId: user.id,
        },
      });
      if (!deleterefreshToken) throw new Error("Đăng nhập thất bại");
      await UserService.UpdateUser(user.id, { token: accessToken });
      await AuthService.CreateRefreshToken(refreshTokenInput);
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 60 * 60 * 1000, // 7 ngày
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 30 * 60 * 60 * 1000 * 24, // 30 ngày
      });
      res.json(
        successResponse(
          { role: user.role, accessToken },
          "Đăng nhập thành công"
        )
      );
      logger.info(`${input.identifier} đăng nhập thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async studentLogin(req: Request, res: Response): Promise<void> {
    try {
      const input: LoginInput = req.body;
      const user = await AuthService.findUserByIdentifier(input.identifier);

      if (!user) {
        logger.error(`Tài khoản ${input.identifier} không tồn tại`);
        res
          .status(400)
          .json(validateData("identifier", "Tài khoản không tồn tại"));
        return;
      }

      // Verify this is a Student role
      if (user.role !== "Student") {
        logger.error(`Tài khoản ${input.identifier} không phải là thí sinh`);
        res
          .status(400)
          .json(validateData("identifier", "Tài khoản không phải là thí sinh"));
        return;
      }

      const isPassword = await AuthService.isPassword(
        input.password,
        user.password
      );
      if (!isPassword) {
        logger.error(`Thí sinh ${input.identifier} nhập sai mật khẩu`);
        res.status(400).json(validateData("password", "Sai mật khẩu"));
        return;
      }

      const tokenData = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      };

      const accessToken = await AuthService.accessToken(tokenData);
      const refreshToken = await AuthService.refreshToken(tokenData);

      // Update user token
      await UserService.UpdateUser(user.id, { token: accessToken });

      // Delete old refresh tokens
      await prisma.refreshToken.deleteMany({
        where: { userId: user.id },
      });

      // Create new refresh token
      await AuthService.CreateRefreshToken({
        userId: user.id,
        refreshToken: refreshToken,
      });

      // Set cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 60 * 60 * 1000 * 24, // 30 days
      });

      res.json(
        successResponse(
          { role: user.role, accessToken },
          "Đăng nhập thành công"
        )
      );
      logger.info(
        `Thí sinh ${input.identifier} đăng nhập thành công | User ID: ${user.id}`
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(500).json(errorResponse((error as Error).message));
    }
  }

  static async profileStudent(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new Error("Không tìm thấy người dùng");
      }
      const user = req.user;

      // Kiểm tra role
      if (user.role !== "Student") {
        res.status(400).json(errorResponse("Tài khoản không phải là thí sinh"));
        return;
      }

      // Lấy thông tin student
      const student = await prisma.student.findUnique({
        where: { userId: user.userId },
        include: { class: true },
      });
      if (!student) {
        res
          .status(400)
          .json(errorResponse("Không tìm thấy thông tin thí sinh"));
        return;
      }
      if (!student.isActive) {
        res
          .status(400)
          .json(errorResponse("Tài khoản thí sinh đã bị vô hiệu hóa"));
        return;
      }

      // Lấy contestant
      const currentContestantId = await findCurrentContestantId(user.userId);
      const contestant = await prisma.contestant.findFirst({
        where: {
          id: currentContestantId ?? -1,
          studentId: student.id,
          contest: {
            status: {
              in: [
                ContestStatus.ongoing,
                ContestStatus.upcoming,
                ContestStatus.finished,
              ],
            },
          },
        },
        include: { contest: true },
      });
      if (!contestant) {
        res
          .status(400)
          .json(
            errorResponse("Không tìm thấy thông tin thí sinh trong cuộc thi")
          );
        return;
      }

      // Lấy matches
      const activeMatches = await prisma.match.findMany({
        where: {
          round: {
            contestId: contestant.contestId,
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          currentQuestion: true,
          remainingTime: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Lấy registrationNumber
      let registrationNumber = null;
      if (activeMatches.length > 0) {
        const contestantMatch = await prisma.contestantMatch.findFirst({
          where: {
            contestantId: contestant.id,
            matchId: activeMatches[0].id,
          },
          select: {
            registrationNumber: true,
          },
        });
        registrationNumber = contestantMatch?.registrationNumber || null;
      }

      const responseData = {
        role: user.role,
        contestant: {
          id: contestant.id,
          fullName: student.fullName,
          studentCode: student.studentCode,
          class: student.class?.name || null,
          contestId: contestant.contestId,
        },
        contest: {
          id: contestant.contest.id,
          name: contestant.contest.name,
          slug: contestant.contest.slug,
        },
        matches: activeMatches,
        socket: `student-${student.id}`,
      };

      res.json(
        successResponse(responseData, "Lấy thông tin thí sinh thành công")
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(500).json(errorResponse((error as Error).message));
    }
  }
  /**
   * @description Lấy registrationNumber
   * @returns
   */
  static async getRegistrationNumber(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new Error("Không tìm thấy người dùng");
      }
      const { contestantId, matchId } = req.query; // hoặc req.body nếu dùng POST

      if (!contestantId || !matchId) {
        res.status(400).json(errorResponse("Thiếu contestantId hoặc matchId"));
        return;
      }

      // Lấy registrationNumber
      const contestantMatch = await prisma.contestantMatch.findFirst({
        where: {
          contestantId: Number(contestantId),
          matchId: Number(matchId),
        },
        select: {
          registrationNumber: true,
        },
      });

      if (!contestantMatch) {
        res
          .status(404)
          .json(errorResponse("Không tìm thấy registrationNumber"));
        return;
      }

      res.json(
        successResponse(
          { registrationNumber: contestantMatch.registrationNumber },
          "Lấy registrationNumber thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(500).json(errorResponse((error as Error).message));
    }
  }
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new Error("Không tìm thấy người dùng ");
      }
      const userId: number = req.user.userId!;
      await UserService.UpdateUser(userId, { token: "" });
      await AuthService.deleteRefreshToken(userId);
      res.clearCookie("accessToken", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      res.clearCookie("refreshToken", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      res.json({
        success: true,
        message: "Đăng xuất thành công",
      });
      logger.info(`${req.user.username} đăng xuất thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async refreshAccToken(req: Request, res: Response): Promise<void> {
    try {
      const token: string = req.cookies.refreshToken;
      if (!token) {
        throw new Error("Không tìm thấy refreshtoken");
      }
      const payload = verifyToken(token);
      if (payload.type != "refresh") {
        throw new Error("Sai loại token");
      }
      const refreshtoken = await AuthService.getRefreshtokenByUseridToken(
        payload.userId,
        token
      );
      if (!refreshtoken || new Date(refreshtoken.expiredAt) < new Date()) {
        throw new Error("Token hết hạn");
      }
      const { userId, email, role, username } = payload;
      const newPayLoad = { userId, email, role, username };
      const newAccessToken = generateAccessToken(newPayLoad);
      const data: any = {};
      data.token = newAccessToken;
      await UserService.UpdateUser(userId, data);
      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 60 * 60 * 1000, // 7 ngày
        secure: process.env.NODE_ENV === "production",
      });
      logger.info(`${payload.username} lấy token mới thành công`);
      res.json({
        success: true,
        message: "Lấy token mới thành công",
      });
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const input: forgotPasswordInput = req.body;
      const user = await UserService.getUserByEmail(input.email);
      if (!user) {
        throw new Error("Không tìm thấy tài khoản");
      }
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiredAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
      otpWrongAttempts.delete(user.email);
      const data: any = {
        otpCode: otp,
        otpExpiredAt: expiredAt,
      };
      await UserService.UpdateUser(user.id, data);
      await sendOtp({
        to: user.email,
        subject: "Mã OTP đặt lại mật khẩu",
        html: `
          <p>Xin chào ${user.username},</p>
          <p>Mã xác thực của bạn là:</p>
          <h2>${otp}</h2>
          <p>Mã có hiệu lực trong ${OTP_TTL_MINUTES} phút.</p>
        `,
      });

      res.json({
        success: true,
        message: "Gửi mã xác thực thành công",
      });
      logger.info(` Gửi mã otp cho email ${input.email} thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const input: OtpInput = req.body;
      const user = await UserService.getUserByEmail(input.email);
      if (!user) {
        throw new Error("Không tìm thấy tài khoản");
      }
      const isOtpExpired = await AuthService.isOtpExpired(
        user.otpExpiredAt ?? undefined
      );
      if (isOtpExpired) {
        throw new Error("Mã OTP đã hết hạn");
      }
      const isOptCode = await AuthService.isOtpCode(
        String(input.otp),
        user.otpCode ?? ""
      );
      if (isOptCode) {
        await recordWrongOtp(user.id, user.email);
        throw new Error("Mã OTP không chính xác");
      }
      res.json(successResponse(null, "Xác nhận OTP thành công"));
      logger.info(`${user.username} xác nhận otp thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const input: ResetPasswordInput = req.body;
      const user = await UserService.getUserByEmail(input.email);
      if (!user) {
        throw new Error("Đổi mật khẩu thất bại");
      }
      const isOtpExpired = await AuthService.isOtpExpired(
        user.otpExpiredAt ?? undefined
      );
      if (isOtpExpired) {
        throw new Error("Mã OTP đã hết hạn");
      }
      const isOptCode = await AuthService.isOtpCode(
        String(input.otp),
        user.otpCode ?? ""
      );
      if (isOptCode) {
        await recordWrongOtp(user.id, user.email);
        throw new Error("Đổi mật khẩu thất bại");
      }
      otpWrongAttempts.delete(user.email);
      const data: any = {
        email: input.email,
        otp: input.otp,
        password: input.newPassword,
        otpCode: null,
        otpExpiredAt: null,
      };
      await UserService.UpdateUser(user.id, data);
      res.json(successResponse(null, "Đổi mật khẩu thành công"));
      logger.info(`${user.username} đổi mật khẩu thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async profile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new Error("Không tìm thấy người dùng");
      }
      const user = req.user;
      logger.info(`Truy cập hồ sơ ${req.user.username} thành công`);
      res.json(
        successResponse({
          id: user.userId,
          username: user.username,
          email: user.email,
          isActive: user.isActive,
          role: user.role,
        })
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async changePassWord(req: Request, res: Response): Promise<void> {
    try {
      const input: ChangePassWordInput = req.body;
      if (!req.user) {
        throw new Error("Không tìm thấy người dùng");
      }
      const isPassWord = await AuthService.isPassword(
        input.currentPassword,
        req.user.password
      );
      if (!isPassWord) {
        throw new Error("Sai mật khẩu hiện tại");
      }
      await UserService.UpdateUser(req.user.userId, {
        password: input.newPassword,
      });
      res.json(successResponse(null, "Đổi mật khẩu thành công"));
      logger.info(`Người dùng ${req.user.username} đổi mật thành công`);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async changeInfo(req: Request, res: Response): Promise<void> {
    try {
      const input: ChangeInfoInput = req.body;
      if (!req.user) {
        throw new Error("Không tìm thấy người dùng");
      }
      const extisingEmail = await UserService.existingEmailForUpdate(
        input.email,
        req.user.userId
      );
      if (extisingEmail) {
        throw new Error("Email đã tồn tại");
      }
      await UserService.UpdateUser(req.user.userId, {
        email: input.email,
      });
      logger.info(`Tài khoản ${req.user.username} thay đổi email thành công`);
      res.json(successResponse(null, "Cập nhật email thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}

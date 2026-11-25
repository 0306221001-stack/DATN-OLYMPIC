import { CreateRefreshTokenInput } from "./auth.schema";
import { prisma } from "@/config/database";
import bcrypt from "bcrypt";
import { User, Role } from "@prisma/client";
import {
  generateAccessToken,
  generateRefreshToken,
  JwtPayload,
} from "@/utils/jwt";
import { StudentRegisterInput } from "./auth.schema";
import StudentService from "../student/student.service";
import UserService from "../user/user.service";

export default class AuthService {
  static async findUserByIdentifier(identifier: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });
  }
  static async isPassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
  static async accessToken(user: Omit<JwtPayload, "type">) {
    return generateAccessToken({
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  }
  static async refreshToken(user: Omit<JwtPayload, "type">) {
    return generateRefreshToken({
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  }

  static async CreateRefreshToken(data: CreateRefreshTokenInput) {
    return await prisma.refreshToken.create({
      data: {
        userId: data.userId,
        refreshToken: data.refreshToken,
        expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
      },
    });
  }
  static async getRefreshtokenByUseridToken(id: number, token: string) {
    const refreshToken = await prisma.refreshToken.findFirst({
      where: {
        userId: id,
        refreshToken: token,
      },
    });
    return refreshToken;
  }
  static async deleteRefreshToken(id: number) {
    return await prisma.refreshToken.deleteMany({
      where: { userId: id },
    });
  }
  static async isOtpExpired(OtpExpired?: Date): Promise<Boolean> {
    if (!OtpExpired) return true;
    return new Date() > OtpExpired;
  }
  static async isOtpCode(otp: string, otpCode: string): Promise<Boolean> {
    if (!otpCode) return true;
    return otp !== otpCode;
  }

  /**
   * Tự động sinh mã sinh viên duy nhất
   * Format: SV + 2 chữ số năm + 6 chữ số timestamp
   * Ví dụ: SV24123456, SV24123457, ... (tổng 10 ký tự)
   */
  static async generateStudentCode(): Promise<string> {
    const currentYear = new Date().getFullYear().toString().slice(-2); // Lấy 2 chữ số cuối của năm

    // Sử dụng timestamp để đảm bảo unique
    // Lấy 6 chữ số cuối của timestamp
    const timestamp = Date.now().toString().slice(-6);

    const studentCode = `SV${currentYear}${timestamp}`;

    // Kiểm tra xem mã này đã tồn tại chưa (để đảm bảo 100% không trùng)
    const existingStudent = await prisma.student.findFirst({
      where: {
        studentCode: studentCode,
      },
    });

    // Nếu vẫn trùng (rất hiếm), tạo lại với timestamp mới
    if (existingStudent) {
      // Đợi 1ms và tạo lại
      await new Promise(resolve => setTimeout(resolve, 1));
      return this.generateStudentCode();
    }

    return studentCode;
  }

  static async registerStudent(input: StudentRegisterInput) {
    // Kiểm tra username đã tồn tại chưa
    const existingUserName = await UserService.existingUserName(input.username);
    if (existingUserName) {
      throw new Error("USERNAME_EXISTS");
    }

    // Kiểm tra email đã tồn tại chưa
    const existingEmail = await UserService.existingEmail(input.email);
    if (existingEmail) {
      throw new Error("EMAIL_EXISTS");
    }

    // Kiểm tra lớp có tồn tại không
    const existingClass = await prisma.class.findFirst({
      where: { id: input.classId, isActive: true },
    });
    if (!existingClass) {
      throw new Error("CLASS_NOT_EXISTS");
    }

    // Tự động sinh mã sinh viên
    const studentCode = await this.generateStudentCode();

    // Mã hóa mật khẩu
    const { confirmPassword, fullName, classId, ...userInput } = input;
    const hashedPassword = await bcrypt.hash(userInput.password, 10);

    // Tạo transaction để đảm bảo tính nhất quán dữ liệu
    const result = await prisma.$transaction(async tx => {
      // Tạo User với role Student
      const user = await tx.user.create({
        data: {
          ...userInput,
          password: hashedPassword,
          role: Role.Student,
        },
      });

      // Tạo Student với userId liên kết
      const student = await tx.student.create({
        data: {
          fullName,
          studentCode,
          isActive: true,
          userId: user.id,
          classId: classId,
        },
      });

      return { user, student };
    });

    return {
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        role: result.user.role,
      },
      student: result.student,
    };
  }
}

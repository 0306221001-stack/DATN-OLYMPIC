import { nativeEnum, number, string, z } from "zod";
import { Role } from "@prisma/client";

export const RegisterSchema = z
  .object({
    username: z
      .string()
      .min(3, "Tên tài khoản ít nhất 3 kí tự")
      .max(20, "Tên tài tối đa 20 kí tự"),
    email: z
      .string()
      .min(1, "Vui lòng nhập email")
      .email("Vui lòng nhập đúng định dạng email"),
    password: z
      .string()
      .min(8, "Mật khẩu mới là bắt buộc và phải có ít nhất 8 ký tự")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
        "Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa và chữ thường"
      ),
    confirmPassword: z
      .string()
      .min(8, "Xác nhận mật khẩu mới là bắt buộc và phải có ít nhất 8 ký tự")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
        "Xác nhận mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa và chữ thường"
      ),
    role: z.nativeEnum(Role).default("Judge"),
    isActive: z.boolean(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Xác nhận mật khẩu không khớp với mật khẩu",
    path: ["confirmPassword"],
  });
export const CreateRefreshTokenShchema = z.object({
  userId: z.number(),
  refreshToken: z.string(),
});

export const LoginSchema = z.object({
  identifier: z
    .string({
      required_error: "Vui lòng nhập tên đăng nhập hoặc email",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi ",
    })
    .min(1, "Vui lòng nhập tên đăng nhập hoặc email"),
  password: z
    .string({
      required_error: "Vui lòng nhập mật khẩu",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập mật khẩu"),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({
      required_error: "Vui lòng nhập email",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi ",
    })
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
});

export const UpdateUserSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ")
    .optional(),
  role: z.nativeEnum(Role).default(Role.Judge).optional(),
});

export const otpShema = forgotPasswordSchema.extend({
  otp: z.string({
    required_error: "Vui lòng nhập mã OTP",
    invalid_type_error: "Vui lòng nhập kí tự chuỗi ",
  }),
});

export const ResetPasswordShema = otpShema
  .extend({
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới là bắt buộc và phải có ít nhất 8 ký tự")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
        "Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa và chữ thường"
      ),
    confirmNewPassword: z
      .string()
      .min(8, "Xác nhận mật khẩu mới là bắt buộc và phải có ít nhất 8 ký tự")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
        "Xác nhận mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa và chữ thường"
      ),
  })
  .refine(data => data.newPassword === data.confirmNewPassword, {
    message: "Mật khẩu mới và xác nhận mật khẩu không khớp",
    path: ["confirmNewPassword"],
  });

export const ChangePassWordShema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới là bắt buộc và phải có ít nhất 8 ký tự")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
        "Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa và chữ thường"
      ),
    confirmNewPassword: z
      .string()
      .min(8, "Xác nhận mật khẩu mới là bắt buộc và phải có ít nhất 8 ký tự")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
        "Xác nhận mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa và chữ thường"
      ),
  })
  .refine(data => data.newPassword === data.confirmNewPassword, {
    message: "Mật khẩu mới và xác nhận mật khẩu không khớp",
    path: ["confirmNewPassword"],
  });

export const ChangeInfoShema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Vui lòng nhập đúng định dạng email"),
});

export const StudentRegisterSchema = z
  .object({
    username: z
      .string()
      .min(3, "Tên tài khoản ít nhất 3 kí tự")
      .max(20, "Tên tài tối đa 20 kí tự"),
    email: z
      .string()
      .min(1, "Vui lòng nhập email")
      .email("Vui lòng nhập đúng định dạng email"),
    password: z
      .string()
      .min(8, "Mật khẩu mới là bắt buộc và phải có ít nhất 8 ký tự")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
        "Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa và chữ thường"
      ),
    confirmPassword: z
      .string()
      .min(8, "Xác nhận mật khẩu mới là bắt buộc và phải có ít nhất 8 ký tự")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
        "Xác nhận mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa và chữ thường"
      ),
    fullName: z
      .string()
      .min(1, "Vui lòng nhập họ và tên")
      .max(255, "Họ và tên tối đa 255 kí tự"),
    classId: z
      .number({
        required_error: "Vui lòng chọn lớp",
        invalid_type_error: "Id lớp là một số nguyên",
      })
      .refine(val => !isNaN(val) && val > 0, "Id lớp là một số nguyên dương"),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Xác nhận mật khẩu không khớp với mật khẩu",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof LoginSchema>;
export type forgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordShema>;
export type CreateRefreshTokenInput = z.infer<typeof CreateRefreshTokenShchema>;
export type OtpInput = z.infer<typeof otpShema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type StudentRegisterInput = z.infer<typeof StudentRegisterSchema>;
export type ChangePassWordInput = z.infer<typeof ChangePassWordShema>;
export type ChangeInfoInput = z.infer<typeof ChangeInfoShema>;

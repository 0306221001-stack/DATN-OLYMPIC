import { number, z } from "zod";
import { Role } from "@prisma/client";

export const UpdateUserSchema = z.object({
  email: z
    .string({
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .email("Vui lòng nhập đúng định dạng email")
    .optional(),
  role: z.nativeEnum(Role).optional(),
  token: z
    .string({
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .optional(),
  isActive: z.boolean().optional(),
  password: z.string().optional(),
  updateAt: z.date().optional(),
  otpCode: z.number().optional(),
  otpExpiredAt: z.date().optional(),
});
export const CreateUserSchema = z.object({
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
  role: z.nativeEnum(Role).default("Judge"),
  isActive: z.boolean(),
});

export const UserIdShema = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, {
      message: "Id phải là một số nguyên dương",
    }),
});

export const UserQuerySchema = z.object({
  page: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Page phải là số nguyên dương")
    .optional()
    .default("1"),
  limit: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Limit phải là số nguyên dương")
    .optional()
    .default("10"),
  search: z.string().optional(),
  isActive: z
    .string()
    .transform(val => val === "true")
    .optional(),
  role: z.nativeEnum(Role).optional(),
});

export const deleteUsersSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});
export type UserInput = z.infer<typeof UpdateUserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserIdInput = z.infer<typeof UserIdShema>;
export type UserQueryInput = z.infer<typeof UserQuerySchema>;

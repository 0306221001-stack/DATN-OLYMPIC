import z from "zod";
import { Student } from "@prisma/client";

export const StudentShame = z.object({
  id: z.number(),
  fullName: z.string(),
  studentCode: z.string().optional(),
  isActive: z.boolean(),
  className: z.string(),
});

export const CreateStudentShema = z.object({
  fullName: z
    .string({
      required_error: "Vui lòng nhập họ và tên",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên họ và tên")
    .max(255, "Tên lớp tối đa 255 kí tự"),
  classId: z
    .number({
      required_error: "Vui lòng nhập id lớp",
      invalid_type_error: "Id lớp là một số nguyên",
    })
    .refine(val => !NaN && val > 0, "Id lớp là một số nguyên dương"),
  studentCode: z
    .string({
      required_error: "Vui lòng nhập mã số sinh viên",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên họ và tên")
    .max(12, "Tên lớp tối đa 12 kí tự")
    .optional(),
  userId: z
    .number({
      required_error: "Vui lòng nhập user ID",
      invalid_type_error: "User ID là một số nguyên",
    })
    .refine(val => !NaN && val > 0, "User ID là một số nguyên dương")
    .optional(),
  isActive: z.boolean().optional(),
  avatar: z.string().max(255, "Avatar tối đa 255 kí tự").optional(),
  bio: z.string().max(1000, "Bio tối đa 1000 kí tự").optional(),
});

export const StudentIdShame = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const UpdateStundentShema = z.object({
  fullName: z
    .string({
      required_error: "Vui lòng nhập họ và tên",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên họ và tên")
    .max(255, "Tên lớp tối đa 255 kí tự")
    .optional(),
  classId: z
    .number({
      required_error: "Vui lòng nhập id lớp",
      invalid_type_error: "Id lớp là một số nguyên",
    })
    .refine(val => !NaN && val > 0, "Id lớp là một số nguyên dương")
    .optional(),
  studentCode: z
    .string({
      required_error: "Vui lòng nhập mã số sinh viên",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên họ và tên")
    .max(12, "Tên lớp tối đa 12 kí tự")
    .optional()
    .optional(),
  isActive: z.boolean().optional(),
  avatar: z.string().max(255, "Avatar tối đa 255 kí tự").optional(),
  bio: z.string().max(1000, "Bio tối đa 1000 kí tự").optional(),
  userId: z.number().min(1, "User ID phải là số nguyên dương").optional(),
});

export const StudentQuerySchema = z.object({
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
  search: z.string().max(100, "Từ khóa tìm kiếm tối đa 100 ký tự").optional(),
  isActive: z
    .string()
    .optional()
    .transform(val => val === "true")
    .optional(),
  classId: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id lớp phải là số nguyên dương")
    .optional(),
});

export const deleteStudentsSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export type StudentType = {
  id: number;
  fullName: string;
  studentCode: string | null;
  classId: number;
  isActive: boolean;
  bio: string | null;
  avatar: string | null;
  userId: number | null;
  class: {
    name: string;
  };
  user: {
    username: string;
  } | null;
};

export type CreateStudentInput = z.infer<typeof CreateStudentShema>;
export type StudentIdParams = z.infer<typeof StudentIdShame>;
export type UpdateStudentInput = z.infer<typeof UpdateStundentShema>;
export type StudentQueryInput = z.infer<typeof StudentQuerySchema>;
export type Students = z.infer<typeof StudentShame>;

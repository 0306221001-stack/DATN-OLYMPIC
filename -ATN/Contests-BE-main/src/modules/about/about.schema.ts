import { z } from "zod";

// Media object schema for logo and banner
export const MediaObjectSchema = z.object({
  url: z.string().url("URL không hợp lệ"),
  filename: z.string().min(1, "Filename không được để trống"),
  originalName: z.string().min(1, "Original name không được để trống"),
  size: z.number().positive("Size phải là số dương"),
  mimeType: z.string().min(1, "MIME type không được để trống"),
  type: z.enum(["image", "video"], { 
    errorMap: () => ({ message: "Type phải là image hoặc video" })
  }),
  description: z.string().optional()
});

export type MediaObject = z.infer<typeof MediaObjectSchema>;

// Create About schema
export const CreateAboutSchema = z.object({
  schoolName: z
    .string({
      required_error: "Vui lòng nhập tên trường",
      invalid_type_error: "Tên trường phải là chuỗi ký tự",
    })
    .min(1, "Vui lòng nhập tên trường")
    .max(255, "Tên trường không được quá 255 ký tự"),

  website: z
    .string()
    .url("URL website không hợp lệ")
    .max(255, "URL website không được quá 255 ký tự")
    .optional(),

  departmentName: z
    .string()
    .max(255, "Tên khoa không được quá 255 ký tự")
    .optional(),

  email: z
    .string()
    .email("Email không hợp lệ")
    .max(255, "Email không được quá 255 ký tự")
    .optional(),

  fanpage: z
    .string()
    .url("URL fanpage không hợp lệ")
    .max(255, "URL fanpage không được quá 255 ký tự")
    .optional(),

  mapEmbedCode: z.string().optional(),

  logo: z.array(MediaObjectSchema).optional(),

  banner: z.array(MediaObjectSchema).optional(),
});

// Update About schema
export const UpdateAboutSchema = z.object({
  schoolName: z
    .string()
    .min(1, "Vui lòng nhập tên trường")
    .max(255, "Tên trường không được quá 255 ký tự")
    .optional(),

  website: z
    .string()
    .url("URL website không hợp lệ")
    .max(255, "URL website không được quá 255 ký tự")
    .optional(),

  departmentName: z
    .string()
    .max(255, "Tên khoa không được quá 255 ký tự")
    .optional(),

  email: z
    .string()
    .email("Email không hợp lệ")
    .max(255, "Email không được quá 255 ký tự")
    .optional(),

  fanpage: z
    .string()
    .url("URL fanpage không hợp lệ")
    .max(255, "URL fanpage không được quá 255 ký tự")
    .optional(),

  mapEmbedCode: z.string().optional(),

  logo: z.array(MediaObjectSchema).optional(),

  banner: z.array(MediaObjectSchema).optional(),
});

// Query parameters schema
export const AboutQuerySchema = z.object({
  page: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Page phải là số nguyên dương")
    .optional()
    .default("1"),

  limit: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0 && val <= 100, "Limit phải từ 1-100")
    .optional()
    .default("10"),

  search: z.string().optional(),

  isActive: z
    .string()
    .transform(val => val === "true")
    .optional(),
});

// ID parameter schema
export const AboutIdSchema = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "ID phải là số nguyên dương"),
});

// TypeScript types
export type CreateAboutInput = z.infer<typeof CreateAboutSchema>;
export type UpdateAboutInput = z.infer<typeof UpdateAboutSchema>;
export type AboutQueryInput = z.infer<typeof AboutQuerySchema>;
export type AboutIdInput = z.infer<typeof AboutIdSchema>;

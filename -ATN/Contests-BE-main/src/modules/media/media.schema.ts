import z from "zod";
import { ContestMedia } from "@prisma/client";
export const CreateMediaShema = z.object({
  url: z.string().min(1, "Vui lòng hình ảnh"),
  type: z.nativeEnum(ContestMedia),
  contestId: z.number(),
});

export const MediaIdShame = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const UpdeateMediahema = z.object({
  url: z.string().min(1, "Vui lòng hình ảnh").optional(),
  type: z.nativeEnum(ContestMedia).optional(),
});

export const deleteMediaesSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export const MediaQuerySchema = z.object({
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
  isActive: z
    .string()
    .transform(val => val === "true")
    .optional(),
  type: z.enum(["logo", "background", "images"]).optional(),
});

export type CreateMediaInput = z.infer<typeof CreateMediaShema>;
export type MediaIdParams = z.infer<typeof MediaIdShame>;
export type UpdateMediaInput = z.infer<typeof UpdeateMediahema>;
export type DeleteMediaInput = z.infer<typeof deleteMediaesSchema>;
export type MediaQueryInput = z.infer<typeof MediaQuerySchema>;

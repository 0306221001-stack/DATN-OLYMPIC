import z, { number, string } from "zod";
import { ControlKey, ControlValue } from "@prisma/client";
import { deleteContestsesSchema } from "../contest/contest.schema";
export const CreateScreenSchema = z.object({
  controlKey: z.nativeEnum(ControlKey),
  controlValue: z.nativeEnum(ControlValue),
  matchId: z.number(),
  media: z.string().optional(),
});

export const ScreenSchema = z.object({
  controlKey: z.nativeEnum(ControlKey),
  controlValue: z.nativeEnum(ControlValue).nullable(),
  matchId: z.number(),
  media: z.string().nullable(),
  matchName: z.string(),
  value: z.string().optional(),
});

export const ScreensIdShema = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const UpdateScreenSchema = z.object({
  controlKey: z.nativeEnum(ControlKey).optional(),
  controlValue: z.nativeEnum(ControlValue).optional(),
  matchId: z.number().optional(),
  media: z.string().optional(),
  value: z.string().optional(),
});

export const ScreenQuerySchema = z.object({
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
  matchId: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id lớp phải là số nguyên dương")
    .optional(),
});

export const deleteScreensSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export type ScreensIdParams = z.infer<typeof ScreensIdShema>;
export type UpdateScreenInput = z.infer<typeof UpdateScreenSchema>;
export type CreateScreenInput = z.infer<typeof CreateScreenSchema>;
export type ScreenQueryInput = z.infer<typeof ScreenQuerySchema>;
export type DeleteScreenType = z.infer<typeof deleteContestsesSchema>;
export type SceenType = z.infer<typeof ScreenSchema>;

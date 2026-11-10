import { z } from "zod";
import { AwardType } from "@prisma/client";
import { match } from "assert";

// Create Award Schema
export const createAwardSchema = z.object({
  name: z
    .string()
    .min(1, "Tên giải thưởng không được để trống")
    .max(255, "Tên giải thưởng không được vượt quá 255 ký tự"),
  contestId: z
    .number()
    .int("Contest ID phải là số nguyên")
    .positive("Contest ID phải là số dương"),
  contestantId: z
    .union([
      z
        .number()
        .int("Contestant ID phải là số nguyên")
        .positive("Contestant ID phải là số dương"),
      z.null(),
    ])
    .nullable()
    .optional(),
  type: z.nativeEnum(AwardType, {
    errorMap: () => ({ message: "Loại giải thưởng không hợp lệ" }),
  }),
  matchId: z
    .number()
    .int("Match ID phải là số nguyên")
    .positive("Match ID phải là số dương")
    .optional(),
});

// Update Award Schema (using PATCH method for flexible updates)
export const updateAwardSchema = z.object({
  name: z
    .string()
    .min(1, "Tên giải thưởng không được để trống")
    .max(255, "Tên giải thưởng không được vượt quá 255 ký tự")
    .optional(),
  contestId: z
    .number()
    .int("Contest ID phải là số nguyên")
    .positive("Contest ID phải là số dương")
    .optional(),
  contestantId: z
    .union([
      z
        .number()
        .int("Contestant ID phải là số nguyên")
        .positive("Contestant ID phải là số dương"),
      z.null(),
    ])
    .nullable()
    .optional(),
  type: z
    .nativeEnum(AwardType, {
      errorMap: () => ({ message: "Loại giải thưởng không hợp lệ" }),
    })
    .optional(),
  matchId: z
    .number()
    .int("Match ID phải là số nguyên")
    .positive("Match ID phải là số dương")
    .optional(),
});
// Prevent unknown fields

// Get Award by ID Schema
export const getAwardByIdSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID phải là số").transform(Number),
});

// Delete Award Schema
export const deleteAwardSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID phải là số").transform(Number),
});

// Batch Delete Awards Schema
export const batchDeleteAwardsSchema = z.object({
  ids: z
    .array(z.number().int().positive())
    .min(1, "Danh sách ID không được để trống")
    .max(100, "Không thể xóa quá 100 giải thưởng cùng lúc"),
});

// Get Awards with Query Schema
export const getAwardsQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, "Page phải là số")
    .transform(Number)
    .refine(val => val >= 1, "Page phải lớn hơn hoặc bằng 1")
    .optional()
    .default("1"),
  limit: z
    .string()
    .regex(/^\d+$/, "Limit phải là số")
    .transform(Number)
    .refine(val => val >= 1 && val <= 100, "Limit phải từ 1 đến 100")
    .optional()
    .default("10"),
  search: z
    .string()
    .max(255, "Từ khóa tìm kiếm không được vượt quá 255 ký tự")
    .optional(),
  matchId: z
    .number()
    .int("Match ID phải là số nguyên")
    .positive("Match ID phải là số dương")
    .optional(),
});

// Contest Slug Parameter Schema
export const contestSlugSchema = z.object({
  slug: z
    .string()
    .min(1, "Contest slug không được để trống")
    .max(255, "Contest slug không được vượt quá 255 ký tự"),
});

// Create Award by Contest Slug Schema (không cần contestId vì lấy từ slug)
export const createAwardByContestSlugSchema = z.object({
  name: z
    .string()
    .min(1, "Tên giải thưởng không được để trống")
    .max(255, "Tên giải thưởng không được vượt quá 255 ký tự"),
  slug: z
    .string()
    .min(1, "Slug không được để trống")
    .max(255, "Slug không được vượt quá 255 ký tự")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug chỉ được chứa chữ thường, số và dấu gạch ngang"
    ),
  contestantId: z
    .union([
      z
        .number()
        .int("Contestant ID phải là số nguyên")
        .positive("Contestant ID phải là số dương"),
      z.null(),
    ])
    .nullable()
    .optional(),
  type: z.nativeEnum(AwardType, {
    errorMap: () => ({ message: "Loại giải thưởng không hợp lệ" }),
  }),
});

// Get Contest Slug Schema
export const getContestSlugSchema = z.object({
  slug: z
    .string()
    .min(1, "Contest slug không được để trống")
    .max(255, "Contest slug không được vượt quá 255 ký tự"),
});

// Create Award by Contest Schema
export const createAwardByContestSchema = z.object({
  name: z
    .string()
    .min(1, "Tên giải thưởng không được để trống")
    .max(255, "Tên giải thưởng không được vượt quá 255 ký tự"),
  contestantId: z
    .number()
    .int("Contestant ID phải là số nguyên")
    .positive("Contestant ID phải là số dương")
    .optional()
    .nullable(),
  type: z.nativeEnum(AwardType, {
    errorMap: () => ({ message: "Loại giải thưởng không hợp lệ" }),
  }),
  matchId: z
    .number()
    .int("Match ID phải là số nguyên")
    .positive("Match ID phải là số dương")
    .optional(),
});

// TypeScript types
export type CreateAwardData = z.infer<typeof createAwardSchema>;
export type CreateAwardByContestData = z.infer<
  typeof createAwardByContestSchema
>;
export type GetContestSlugParams = z.infer<typeof getContestSlugSchema>;
export type UpdateAwardData = z.infer<typeof updateAwardSchema>;
export type GetAwardByIdParams = z.infer<typeof getAwardByIdSchema>;
export type DeleteAwardParams = z.infer<typeof deleteAwardSchema>;
export type GetAwardsQuery = z.infer<typeof getAwardsQuerySchema>;
export type BatchDeleteAwardsData = z.infer<typeof batchDeleteAwardsSchema>;

// Response types
export interface AwardResponse {
  id: number;
  name: string;
  type: AwardType;
  contestant?: {
    student: {
      fullName: string;
    };
  } | null;
}

export interface AwardListResponse {
  awards: AwardResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface BatchDeleteResult {
  successIds: number[];
  failedIds: number[];
  errors: Array<{
    id: number;
    error: string;
  }>;
}

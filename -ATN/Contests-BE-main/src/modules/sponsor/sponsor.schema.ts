import { z } from "zod";

// Create Sponsor Schema
export const createSponsorSchema = z.object({
  name: z
    .string()
    .min(1, "Tên nhà tài trợ không được để trống")
    .max(255, "Tên nhà tài trợ không được quá 255 ký tự"),
  logo: z.string().optional(),
  images: z.string().optional(),
  videos: z.string().optional(),
  contestId: z
    .number()
    .int("Contest ID phải là số nguyên")
    .positive("Contest ID phải là số dương")
    .optional(),
});

// Update Sponsor Schema (PATCH method)
export const updateSponsorSchema = z
  .object({
    name: z
      .string()
      .min(1, "Tên nhà tài trợ không được để trống")
      .max(255, "Tên nhà tài trợ không được quá 255 ký tự")
      .optional(),
    logo: z.string().optional(),
    images: z.string().optional(),
    videos: z.string().optional(),
    contestId: z
      .number()
      .int("Contest ID phải là số nguyên")
      .positive("Contest ID phải là số dương")
      .optional()
      .nullable(), // Allow null to remove contest association  // Flags to indicate file removal (as strings from FormData)
    removeLogo: z
      .string()
      .transform(val => val === "true")
      .optional(),
    removeImages: z
      .string()
      .transform(val => val === "true")
      .optional(),
    removeVideos: z
      .string()
      .transform(val => val === "true")
      .optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: "Ít nhất một trường cần được cập nhật",
  });

// Get Sponsor by ID Schema
export const getSponsorByIdSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID phải là số").transform(Number),
});

// Delete Sponsor Schema
export const deleteSponsorSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID phải là số").transform(Number),
});

// Get Sponsors Query Schema
export const getSponsorsQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, "Page phải là số")
    .transform(Number)
    .refine(val => val > 0, "Page phải lớn hơn 0")
    .default("1"),
  limit: z
    .string()
    .regex(/^\d+$/, "Limit phải là số")
    .transform(Number)
    .refine(val => val > 0 && val <= 100, "Limit phải từ 1-100")
    .default("10"),
  search: z.string().optional(),
});

// Contest Slug Schema
export const contestSlugSchema = z.object({
  slug: z.string().min(1, "Contest slug không được để trống"),
});

// Batch Delete Sponsors Schema
export const batchDeleteSponsorsSchema = z.object({
  ids: z
    .array(z.number().int().positive())
    .min(1, "Danh sách ID không được để trống")
    .max(100, "Không thể xóa quá 100 nhà tài trợ cùng lúc"),
});

// File Upload Schema
export const uploadFilesSchema = z.object({
  logo: z.any().optional(),
  images: z.any().optional(),
  videos: z.any().optional(),
});

// TypeScript Types
export type CreateSponsorData = z.infer<typeof createSponsorSchema>;
export type UpdateSponsorData = z.infer<typeof updateSponsorSchema>;
export type GetSponsorByIdParams = z.infer<typeof getSponsorByIdSchema>;
export type DeleteSponsorParams = z.infer<typeof deleteSponsorSchema>;
export type GetSponsorsQuery = z.infer<typeof getSponsorsQuerySchema>;
export type ContestSlugParams = z.infer<typeof contestSlugSchema>;
export type BatchDeleteSponsorsData = z.infer<typeof batchDeleteSponsorsSchema>;
export type UploadFilesData = z.infer<typeof uploadFilesSchema>;

// Response Types
export interface SponsorResponse {
  id: number;
  name: string;
  logo: string | null;
  images: string | null;
  videos: string;
}

export interface SponsorListResponse {
  sponsors: SponsorResponse[];
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
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

export interface UploadResult {
  logo?: string;
  images?: string;
  videos?: string;
}

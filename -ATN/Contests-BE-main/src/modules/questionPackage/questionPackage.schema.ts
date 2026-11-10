import { z } from "zod";

// Create Question Package Schema
export const CreateQuestionPackageSchema = z.object({
  name: z
    .string()
    .min(1, "Tên gói câu hỏi là bắt buộc")
    .min(3, "Tên gói câu hỏi phải có ít nhất 3 ký tự")
    .max(255, "Tên gói câu hỏi không được vượt quá 255 ký tự")
    .trim(),
  isActive: z.boolean().optional().default(true),
});

// Update Question Package Schema
export const UpdateQuestionPackageSchema = z.object({
  name: z
    .string()
    .min(3, "Tên gói câu hỏi phải có ít nhất 3 ký tự")
    .max(255, "Tên gói câu hỏi không được vượt quá 255 ký tự")
    .trim()
    .optional(),
  isActive: z.boolean().optional(),
});

// Question Package ID Schema
export const QuestionPackageIdSchema = z.object({
  id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "ID phải là số nguyên dương",
    }),
});

// Query Schema for filtering and pagination
export const QuestionPackageQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Trang phải là số nguyên dương",
    }),
  limit: z
    .string()
    .optional()
    .default("10")
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 100, {
      message: "Giới hạn phải là số nguyên dương và không quá 100",
    }),
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      return val === "true";
    }),
  sortBy: z.enum(["name", "createdAt", "updatedAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// Batch Delete Question Packages Schema
export const BatchDeleteQuestionPackagesSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải cung cấp ít nhất một ID")
    .max(100, "Không thể xóa quá 100 mục cùng lúc"),
});

// TypeScript types
export type CreateQuestionPackageInput = z.infer<typeof CreateQuestionPackageSchema>;
export type UpdateQuestionPackageInput = z.infer<typeof UpdateQuestionPackageSchema>;
export type QuestionPackageIdInput = z.infer<typeof QuestionPackageIdSchema>;
export type QuestionPackageQueryInput = z.infer<typeof QuestionPackageQuerySchema>;
export type BatchDeleteQuestionPackagesInput = z.infer<typeof BatchDeleteQuestionPackagesSchema>;

// Response types
export interface QuestionPackageResponse {
  id: number;
  name: string;
  isActive: boolean;
  questionDetailsCount: number;
  matchesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionPackageDetailResponse extends QuestionPackageResponse {
  questionDetails?: Array<{
    questionOrder: number;
    isActive: boolean;
    question: {
      id: number;
      questionType: string;
      difficulty: string;
    };
  }>;
  matches?: Array<{
    id: number;
    name: string;
    startTime: Date;
    endTime: Date;
  }>;
}

export interface BatchDeleteResponse {
  totalRequested: number;
  successful: number;
  failed: number;
  successfulIds: number[];
  failedIds: Array<{
    id: number;
    reason: string;
  }>;
}

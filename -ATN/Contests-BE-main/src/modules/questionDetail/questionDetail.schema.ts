import { z } from "zod";


// phần đồng bộ câu hỏi trong gói câu hỏi (MAINLY FOR ADMIN)
export const SyncQuestionsInPackageSchema = z.object({
  questions: z.array(
    z.object({
      questionId: z.number().int().positive("ID câu hỏi phải là số nguyên dương"),
      questionOrder: z.number().int().positive("Thứ tự câu hỏi phải là số nguyên dương"),
    })
  ).max(100, "Không thể đồng bộ quá 100 câu hỏi cùng lúc"), // Giới hạn để đảm bảo hiệu năng
});

// Create Question Detail Schema
export const CreateQuestionDetailSchema = z.object({
  questionId: z
    .number()
    .int()
    .positive("ID câu hỏi phải là số nguyên dương"),
  questionPackageId: z
    .number()
    .int()
    .positive("ID gói câu hỏi phải là số nguyên dương"),
  questionOrder: z
    .number()
    .int()
    .positive("Thứ tự câu hỏi phải là số nguyên dương"),
  isActive: z.boolean().optional().default(true),
});

// Update Question Detail Schema
export const UpdateQuestionDetailSchema = z.object({
  questionOrder: z
    .number()
    .int()
    .positive("Thứ tự câu hỏi phải là số nguyên dương")
    .optional(),
  isActive: z.boolean().optional(),
});

// Question Detail Composite ID Schema
export const QuestionDetailIdSchema = z.object({
  questionId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "ID câu hỏi phải là số nguyên dương",
    }),
  questionPackageId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "ID gói câu hỏi phải là số nguyên dương",
    }),
});

// Bulk Create Question Details Schema
export const BulkCreateQuestionDetailsSchema = z.object({
  questionPackageId: z
    .number()
    .int()
    .positive("ID gói câu hỏi phải là số nguyên dương"),
  questions: z
    .array(
      z.object({
        questionId: z
          .number()
          .int()
          .positive("ID câu hỏi phải là số nguyên dương"),
        questionOrder: z
          .number()
          .int()
          .positive("Thứ tự câu hỏi phải là số nguyên dương"),
      })
    )
    .min(1, "Phải có ít nhất một câu hỏi")
    .max(50, "Không thể thêm quá 50 câu hỏi cùng lúc"),
});

// Query Schema for filtering and pagination
export const QuestionDetailQuerySchema = z.object({
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
  questionPackageId: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? undefined : parsed;
    })
    .refine((val) => val === undefined || val > 0, {
      message: "ID gói câu hỏi phải là số nguyên dương",
    }),
  questionId: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? undefined : parsed;
    })
    .refine((val) => val === undefined || val > 0, {
      message: "ID câu hỏi phải là số nguyên dương",
    }),
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      return val === "true";
    }),
  sortBy: z.enum(["questionOrder", "createdAt", "updatedAt"]).optional().default("questionOrder"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

// Reorder Questions Schema
export const ReorderQuestionsSchema = z.object({
  questionPackageId: z
    .number()
    .int()
    .positive("ID gói câu hỏi phải là số nguyên dương"),
  reorders: z
    .array(
      z.object({
        questionId: z
          .number()
          .int()
          .positive("ID câu hỏi phải là số nguyên dương"),
        newOrder: z
          .number()
          .int()
          .positive("Thứ tự mới phải là số nguyên dương"),
      })
    )
    .min(1, "Phải có ít nhất một câu hỏi để sắp xếp lại")
    .max(50, "Không thể sắp xếp lại quá 50 câu hỏi cùng lúc"),
});

// Batch Delete Question Details Schema
export const BatchDeleteQuestionDetailsSchema = z.object({
  items: z
    .array(z.object({
      questionId: z.number().int().positive("ID câu hỏi phải là số nguyên dương"),
      questionPackageId: z.number().int().positive("ID gói câu hỏi phải là số nguyên dương"),
    }))
    .min(1, "Phải cung cấp ít nhất một mục để xóa")    .max(100, "Không thể xóa quá 100 mục cùng lúc"),
});

// Package Questions Query Schema (for Get Questions by Package ID with pagination)
export const PackageQuestionsQuerySchema = z.object({
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
  includeInactive: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  search: z.string().optional(),  // New filter options
  questionType: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const validTypes = ["multiple_choice", "essay"];
      return validTypes.includes(val);
    }, {
      message: "Loại câu hỏi không hợp lệ. Chỉ chấp nhận: multiple_choice, essay",
    }),
  difficulty: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const validDifficulties = ["Alpha", "Beta", "Rc", "Gold"];
      return validDifficulties.includes(val);
    }, {
      message: "Độ khó không hợp lệ. Chỉ chấp nhận: Alpha, Beta, Rc, Gold",
    }),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      return val === "true";
    }),
  sortBy: z.enum(["questionOrder", "createdAt", "updatedAt", "difficulty", "questionType"]).optional().default("questionOrder"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

// Question Packages Query Schema (for Get Packages by Question ID with pagination)
export const QuestionPackagesQuerySchema = z.object({
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
  includeInactive: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  search: z.string().optional(),
  sortBy: z.enum(["questionOrder", "createdAt", "updatedAt"]).optional().default("questionOrder"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

// Schema for querying questions not in a package
export const QuestionsNotInPackageQuerySchema = z.object({
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
  questionType: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const validTypes = ["multiple_choice", "essay"];
      return validTypes.includes(val);
    }, {
      message: "Loại câu hỏi không hợp lệ. Chỉ chấp nhận: multiple_choice, essay",
    }),
  difficulty: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const validDifficulties = ["Alpha", "Beta", "Rc", "Gold"];
      return validDifficulties.includes(val);
    }, {
      message: "Độ khó không hợp lệ. Chỉ chấp nhận: Alpha, Beta, Rc, Gold",
    }),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      return val === "true";
    }),
  sortBy: z.enum(["id", "createdAt", "updatedAt", "difficulty", "questionType"]).optional().default("id"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

// TypeScript types
export type SyncQuestionsInPackageInput = z.infer<typeof SyncQuestionsInPackageSchema>;
export type CreateQuestionDetailInput = z.infer<typeof CreateQuestionDetailSchema>;
export type UpdateQuestionDetailInput = z.infer<typeof UpdateQuestionDetailSchema>;
export type QuestionDetailIdInput = z.infer<typeof QuestionDetailIdSchema>;
export type QuestionDetailQueryInput = z.infer<typeof QuestionDetailQuerySchema>;
export type BulkCreateQuestionDetailsInput = z.infer<typeof BulkCreateQuestionDetailsSchema>;
export type ReorderQuestionsInput = z.infer<typeof ReorderQuestionsSchema>;
export type BatchDeleteQuestionDetailsInput = z.infer<typeof BatchDeleteQuestionDetailsSchema>;
export type PackageQuestionsQueryInput = z.infer<typeof PackageQuestionsQuerySchema>;
export type QuestionPackagesQueryInput = z.infer<typeof QuestionPackagesQuerySchema>;
export type QuestionsNotInPackageQueryInput = z.infer<typeof QuestionsNotInPackageQuerySchema>;

// Response types
export interface QuestionDetailResponse {
  questionId: number;
  questionPackageId: number;
  questionOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionDetailListResponse {
  questionId: number;
  questionPackageId: number;
  questionOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  question: {
    id: number;
    questionType: string;
    difficulty: string;
  };
  questionPackage: {
    id: number;
    name: string;
  };
}

export interface QuestionDetailStatsResponse {
  totalQuestionDetails: number;
  activeQuestionDetails: number;
  uniqueQuestions: number;
  uniquePackages: number;
  averageQuestionsPerPackage: number;
}

export interface BatchDeleteResponse {
  totalRequested: number;
  successful: number;
  failed: number;
  successfulItems: Array<{
    questionId: number;
    questionPackageId: number;
  }>;
  failedItems: Array<{
    questionId: number;
    questionPackageId: number;
    reason: string;
  }>;
}

export interface UpdateQuestionDetailResponse {
  updatedQuestionDetail: QuestionDetailResponse;
  swappedWith: {
    questionId: number;
    oldOrder: number;
    newOrder: number;
  } | null;
}

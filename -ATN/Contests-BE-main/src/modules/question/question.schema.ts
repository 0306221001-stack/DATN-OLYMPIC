import { z } from "zod";
import { QuestionType, Difficulty } from "@prisma/client";

// Enums for validation
export const QuestionTypeEnum = z.nativeEnum(QuestionType);
export const DifficultyEnum = z.nativeEnum(Difficulty);

// Media Type Detection
export enum MediaType {
  IMAGE = "image",
  VIDEO = "video", 
  AUDIO = "audio"
}

// Media validation schemas
export const mediaFileSchema = z.object({
  type: z.nativeEnum(MediaType),
  url: z.string().url("URL không hợp lệ"),
  filename: z.string().min(1, "Tên file không được để trống"),
  size: z.number().positive("Kích thước file phải lớn hơn 0"),
  mimeType: z.string().min(1, "MIME type không được để trống"),
  duration: z.number().optional(), // For video/audio
  dimensions: z.object({
    width: z.number(),
    height: z.number()
  }).optional() // For images/videos
});

export const questionMediaSchema = z.array(mediaFileSchema).optional().nullable();

// Option schema for multiple choice questions
// Only support simple string array format
export const stringOptionSchema = z.string().min(1, "Option không được để trống");

// Simple string array format only
export const optionsSchema = z.array(stringOptionSchema)
  .min(2, "Phải có ít nhất 2 lựa chọn")
  .max(6, "Không được quá 6 lựa chọn");

// Create Question Schema
export const createQuestionSchema = z.object({
  intro: z.string().optional(),
  defaultTime: z.preprocess((val) => Number(val), z.number()
    .int("Thời gian phải là số nguyên")
    .min(10, "Thời gian tối thiểu là 10 giây")
    .max(1800, "Thời gian tối đa là 30 phút")),
  questionType: QuestionTypeEnum,
  content: z.string()
    .min(1, "Nội dung HTML không được để trống"),
  questionMedia: questionMediaSchema,
  options: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return undefined;
        }
      }
      return val;
    },
    z.union([
      optionsSchema,
      z.null()
    ])
  ).optional(),
  correctAnswer: z.string()
    .min(1, "Đáp án đúng không được để trống"),
  mediaAnswer: questionMediaSchema,
  score: z.preprocess((val) => Number(val), z.number()
    .int("Điểm phải là số nguyên")
    .min(1, "Điểm tối thiểu là 1")
    .max(100, "Điểm tối đa là 100")).default(1),
  difficulty: DifficultyEnum,
  explanation: z.string().optional().nullable(),
  questionTopicId: z.preprocess((val) => Number(val), z.number()
    .int("Question Topic ID phải là số nguyên")
    .positive("Question Topic ID phải là số dương"))
});

// Update Question Schema (PATCH method)
export const updateQuestionSchema = z.object({
  intro: z.string().optional().nullable(),
  defaultTime: z.preprocess((val) => val === undefined || val === null ? undefined : Number(val), z.number()
    .int("Thời gian phải là số nguyên")
    .min(10, "Thời gian tối thiểu là 10 giây")
.max(1800, "Thời gian tối đa là 30 phút")).optional().nullable(),
  questionType: QuestionTypeEnum.optional(),
  content: z.string()
    .min(1, "Nội dung HTML không được để trống")
    .optional(),
  questionMedia: questionMediaSchema,
  options: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return undefined;
        }
      }
      return val;
    },
    z.union([
      optionsSchema,
      z.null()
    ])
  ).optional(),
  correctAnswer: z.string()
    .min(1, "Đáp án đúng không được để trống")
    .optional(),
  mediaAnswer: questionMediaSchema,
  score: z.preprocess((val) => val === undefined || val === null ? undefined : Number(val), z.number()
    .int("Điểm phải là số nguyên")
    .min(1, "Điểm tối thiểu là 1")
    .max(100, "Điểm tối đa là 100")).optional().nullable(),
  difficulty: DifficultyEnum.optional(),
  explanation: z.string().optional().nullable(),  questionTopicId: z.preprocess((val) => val === undefined || val === null ? undefined : Number(val), z.number()
    .int("Question Topic ID phải là số nguyên")
    .positive("Question Topic ID phải là số dương")).optional().nullable(),
  isActive: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return Boolean(val);
    },
    z.boolean()
  ).optional(),
  // Delete support fields
  deleteQuestionMedia: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return [val];
        }
      }
      return val;
    },
    z.array(z.string())
  ).optional(),
  deleteMediaAnswer: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return [val];
        }
      }
      return val;
    },
    z.array(z.string())
  ).optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Ít nhất một trường cần được cập nhật"
  }
);

// Get Question by ID Schema
export const getQuestionByIdSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, "ID phải là số")
    .transform(Number)
});

// Delete Question Schema (soft delete)
export const deleteQuestionSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, "ID phải là số")
    .transform(Number)
});

// Hard Delete Question Schema
export const hardDeleteQuestionSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, "ID phải là số")
    .transform(Number)
});

// Get Questions Query Schema
export const getQuestionsQuerySchema = z.object({
  page: z.string()
    .regex(/^\d+$/, "Page phải là số")
    .transform(Number)
    .refine(val => val > 0, "Page phải lớn hơn 0")
    .default("1"),
  limit: z.string()
    .regex(/^\d+$/, "Limit phải là số")
    .transform(Number)
    .refine(val => val > 0 && val <= 100, "Limit phải từ 1-100")
    .default("10"),
  search: z.string().optional(),
  questionTopicId: z.string()
    .regex(/^\d+$/, "Question Topic ID phải là số")
    .transform(Number)
    .optional(),
  questionType: QuestionTypeEnum.optional(),
  difficulty: DifficultyEnum.optional(),
  hasMedia: z.string()
    .transform(val => val === "true")
    .optional(),
  isActive: z.string()
    .transform(val => val === "true")
    .optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "defaultTime", "score"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"])
    .default("desc")
});

// Batch Delete Questions Schema
export const batchDeleteQuestionsSchema = z.object({
ids: z.array(z.number().int().positive())
    .min(1, "Danh sách ID không được để trống")
    .max(100, "Không thể xóa quá 100 câu hỏi cùng lúc"),
  hardDelete: z.boolean().default(false)
});

// Media Upload Schemas
export const uploadMediaSchema = z.object({
  questionId: z.number().int().positive(),
  mediaType: z.enum(["questionMedia", "mediaAnswer"]),
  files: z.array(z.any()).min(1, "Phải có ít nhất 1 file")
});

// TypeScript Types
export type CreateQuestionData = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionData = z.infer<typeof updateQuestionSchema>;
export type GetQuestionByIdParams = z.infer<typeof getQuestionByIdSchema>;
export type DeleteQuestionParams = z.infer<typeof deleteQuestionSchema>;
export type HardDeleteQuestionParams = z.infer<typeof hardDeleteQuestionSchema>;
export type GetQuestionsQuery = z.infer<typeof getQuestionsQuerySchema>;
export type BatchDeleteQuestionsData = z.infer<typeof batchDeleteQuestionsSchema>;
export type UploadMediaData = z.infer<typeof uploadMediaSchema>;
export type MediaFile = z.infer<typeof mediaFileSchema>;

// Option types - only string array format
export type QuestionOptions = z.infer<typeof optionsSchema>; // string[]

// Response Types
export interface QuestionResponse {
  id: number;
  intro: string | null;
  defaultTime: number;
  questionType: QuestionType;
  content: string;
  questionMedia: MediaFile[] | null;
  options: QuestionOptions | null;
  correctAnswer: string;
  mediaAnswer: MediaFile[] | null;
  score: number;
  difficulty: Difficulty;
  explanation: string | null;
  questionTopicId: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  questionTopic?: {
    id: number;
    name: string;
  };
  questionDetails?: Array<{
    questionPackageId: number;
    questionOrder: number;
    questionPackage: {
      id: number;
      name: string;
    };
  }>;
}

export interface QuestionListResponse {
  questions: QuestionResponse[];
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

export interface MediaUploadResult {
  success: boolean;
  uploadedFiles: MediaFile[];
  errors: string[];
}
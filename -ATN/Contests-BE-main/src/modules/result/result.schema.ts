import { z } from "zod";

// Create Result Schema
export const createResultSchema = z.object({
  name: z.string()
    .min(1, "Tên kết quả không được để trống")
    .max(255, "Tên kết quả không được quá 255 ký tự"),
  contestantId: z.number()
    .int("Contestant ID phải là số nguyên")
    .positive("Contestant ID phải là số dương"),
  matchId: z.number()
    .int("Match ID phải là số nguyên")
    .positive("Match ID phải là số dương"),
  isCorrect: z.boolean()
    .default(true),
  questionOrder: z.number()
    .int("Question order phải là số nguyên")
    .positive("Question order phải là số dương")
});

// Update Result Schema (PATCH method)
export const updateResultSchema = z.object({
  name: z.string()
    .min(1, "Tên kết quả không được để trống")
    .max(255, "Tên kết quả không được quá 255 ký tự")
    .optional(),
  contestantId: z.number()
    .int("Contestant ID phải là số nguyên")
    .positive("Contestant ID phải là số dương")
    .optional(),
  matchId: z.number()
    .int("Match ID phải là số nguyên")
    .positive("Match ID phải là số dương")
    .optional(),
  isCorrect: z.boolean()
    .optional(),
  questionOrder: z.number()
    .int("Question order phải là số nguyên")
    .positive("Question order phải là số dương")
    .optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Ít nhất một trường cần được cập nhật"
  }
);

// Get Result by ID Schema
export const getResultByIdSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, "ID phải là số")
    .transform(Number)
});

// Get Results by Contestant Schema
export const getResultsByContestantSchema = z.object({
  contestantId: z.string()
    .regex(/^\d+$/, "Contestant ID phải là số")
    .transform(Number)
});

// Get Results by Match Schema
export const getResultsByMatchSchema = z.object({
  matchId: z.string()
    .regex(/^\d+$/, "Match ID phải là số")
    .transform(Number)
});

// Get Results by Contest Slug Schema
export const getResultsByContestSlugSchema = z.object({
  slug: z.string()
    .min(1, "Contest slug không được để trống")
    .max(255, "Contest slug không được quá 255 ký tự")
});

// Get Results by Contest Slug Query Schema
export const getResultsByContestSlugQuerySchema = z.object({
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
  search: z.string()
    .min(1, "Từ khóa tìm kiếm không được để trống")
    .describe("Tìm kiếm theo tên thí sinh hoặc mã thí sinh")
    .optional(),
  matchId: z.string()
    .regex(/^\d+$/, "Match ID phải là số")
    .transform(Number)
    .optional(),
  roundId: z.string()
    .regex(/^\d+$/, "Round ID phải là số")
    .transform(Number)
    .optional(),
  isCorrect: z.string()
    .transform(val => val === "true")
    .optional(),
  questionOrder: z.string()
    .regex(/^\d+$/, "Question order phải là số")
    .transform(Number)
    .optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "questionOrder", "contestant"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"])
    .default("desc")
});

// Delete Result Schema
export const deleteResultSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, "ID phải là số")
    .transform(Number)
});

// Get Results Query Schema
export const getResultsQuerySchema = z.object({
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
  search: z.string()
    .min(1, "Từ khóa tìm kiếm không được để trống")
    .describe("Tìm kiếm theo tên kết quả, tên thí sinh hoặc mã thí sinh")
    .optional(),
  contestantId: z.string()
    .regex(/^\d+$/, "Contestant ID phải là số")
    .transform(Number)
    .optional(),
  matchId: z.string()
    .regex(/^\d+$/, "Match ID phải là số")
    .transform(Number)
    .optional(),
  isCorrect: z.string()
    .transform(val => val === "true")
    .optional(),
  questionOrder: z.string()
    .regex(/^\d+$/, "Question order phải là số")
    .transform(Number)
    .optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "questionOrder"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"])
    .default("desc")
});

// Batch Delete Results Schema
export const batchDeleteResultsSchema = z.object({
  ids: z.array(z.number().int().positive())
    .min(1, "Danh sách ID không được để trống")
    .max(100, "Không thể xóa quá 100 kết quả cùng lúc")
});

// Submit Answer Schema (for students)
export const submitAnswerSchema = z.object({
  matchId: z.number()
    .int("Match ID phải là số nguyên")
    .positive("Match ID phải là số dương"),
  questionOrder: z.number()
    .int("Question order phải là số nguyên")
    .positive("Question order phải là số dương"),
  answer: z.string()
    .min(1, "Câu trả lời không được để trống")
    .max(500, "Câu trả lời không được quá 500 ký tự")
    .transform(val => val.trim()),
  submittedAt: z.string()
    .datetime("Thời gian submit không hợp lệ")
    .optional()
});

// TypeScript Types
export type CreateResultData = z.infer<typeof createResultSchema>;
export type UpdateResultData = z.infer<typeof updateResultSchema>;
export type GetResultByIdParams = z.infer<typeof getResultByIdSchema>;
export type GetResultsByContestantParams = z.infer<typeof getResultsByContestantSchema>;
export type GetResultsByMatchParams = z.infer<typeof getResultsByMatchSchema>;
export type GetResultsByContestSlugParams = z.infer<typeof getResultsByContestSlugSchema>;
export type GetResultsByContestSlugQuery = z.infer<typeof getResultsByContestSlugQuerySchema>;
export type DeleteResultParams = z.infer<typeof deleteResultSchema>;
export type GetResultsQuery = z.infer<typeof getResultsQuerySchema>;
export type BatchDeleteResultsData = z.infer<typeof batchDeleteResultsSchema>;
export type SubmitAnswerData = z.infer<typeof submitAnswerSchema>;

// Response Types
export interface ResultResponse {
  id: number;
  name: string;
  contestantId: number;
  matchId: number;
  isCorrect: boolean;
  questionOrder: number;
  createdAt: Date;
  updatedAt: Date;
  contestant?: {
    id: number;
    name: string;
    studentId: number;
    student?: {
      id: number;
      fullName: string;
      studentCode: string | null;
    };
  };
  match?: {
    id: number;
    name: string;
    roundId: number;
    round?: {
      id: number;
      name: string;
    };
  };
}

export interface ResultListResponse {
  results: ResultResponse[];
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

export interface SubmitAnswerResponse {
  success: boolean;
  message: string;
  result?: {
    isCorrect: boolean;
    questionOrder: number;
    submittedAt: string;
    eliminated?: boolean;
    score?: number;
    correctAnswer?: string;
    explanation?: string;
  };
  alreadyAnswered?: boolean;
}

// 🛡️ NEW: Schema for ban contestant API
export const banContestantSchema = z.object({
  matchId: z.number().int().positive("Match ID phải là số nguyên dương"),
  violationType: z.string().min(1, "Loại vi phạm không được để trống"),
  violationCount: z.number().int().min(1, "Số lần vi phạm phải lớn hơn 0"),
  reason: z.string().min(10, "Lý do cấm phải có ít nhất 10 ký tự"),
  bannedBy: z.string().optional()
});

export type BanContestantData = z.infer<typeof banContestantSchema>;

export interface BanContestantResponse {
  success: boolean;
  message: string;
  data?: {
    contestantId: number;
    matchId: number;
    bannedAt: string;
    reason: string;
    violationType: string;
    violationCount: number;
  };
}

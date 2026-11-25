import z from "zod";
import { ContestantStatus } from "@prisma/client";

export const ContestantSchema = z.object({
  id: z.number().int().optional(), // do @default(autoincrement()
  roundName: z.string(),
  fullName: z.string(),
  studentCode: z.string().nullable().optional(),
  status: z.nativeEnum(ContestantStatus),
  schoolId: z.number().int(),
  schoolName: z.string(),
  classId: z.number().int(),
  className: z.string(),
});

export const CreateContestantSchema = z.object({
  contestId: z.number({
    required_error: "Vui lòng id cuộc thi",
    invalid_type_error: "Vui lòng nhập kí tự số",
  }),
  studentId: z.number({
    required_error: "Vui lòng id cuộc thi",
    invalid_type_error: "Vui lòng nhập kí tự số",
  }),
  roundId: z
    .number({
      required_error: "Vui lòng id cuộc thi",
      invalid_type_error: "Vui lòng nhập kí tự số",
    })
    .int(),
  status: z.nativeEnum(ContestantStatus).optional(),
});

export const UpdateContestantSchema = z.object({
  roundId: z
    .number({
      required_error: "Vui lòng id cuộc thi",
      invalid_type_error: "Vui lòng nhập kí tự số",
    })
    .optional(),
  status: z.nativeEnum(ContestantStatus).optional(),
});

export const ContestantQuerySchema = z.object({
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
  contestId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id cuộc thi phải là số nguyên dương"
    )
    .optional(),
  roundId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id cuộc thi phải là số nguyên dương"
    )
    .optional(),
  studentId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id cuộc thi phải là số nguyên dương"
    )
    .optional(),
  status: z.nativeEnum(ContestantStatus).optional(),
  schoolId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id trường học phải là số nguyên dương"
    )
    .optional(),
  classId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id lớp học phải là số nguyên dương"
    )
    .optional(),
  groupId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val),
      "Id nhóm phải là số nguyên"
    )
    .optional(),
  matchId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id trận đấu phải là số nguyên dương"
    )
    .optional(),
  schoolIds: z.preprocess(
    val => typeof val === "string" ? val.split(",").map(Number) : val,
    z.array(z.number()).optional()
  ),
  classIds: z.preprocess(
    val => typeof val === "string" ? val.split(",").map(Number) : val,
    z.array(z.number()).optional()
  ),
});

export const ContestantByContestQuerySchema = z.object({
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
  contestId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id cuộc thi phải là số nguyên dương"
    )
    .optional(),
  roundId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id cuộc thi phải là số nguyên dương"
    )
    .optional(),
  studentId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id cuộc thi phải là số nguyên dương"
    )
    .optional(),
  status: z.nativeEnum(ContestantStatus).optional(),
});

export const ContestantIdShame = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id cuộc thi phải là số nguyên dương"
    )
    .optional(),
});

export const deleteContestantesSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export const CreatesContestShema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
  roundId: z.number({
    invalid_type_error: "Id trận đấu là ký tự số",
    required_error: "Vui lòng nhập id trận đấu",
  }),
});

export const ContestantMatchParamsSchema = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id thí sinh phải là số nguyên dương"
    ),
  matchId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id trận đấu phải là số nguyên dương"
    ),
});

export const ContestantDetailParamsSchema = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id thí sinh phải là số nguyên dương"
    ),
  slug: z
    .string()
    .min(1, "Slug cuộc thi không được để trống"),
  matchId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id trận đấu phải là số nguyên dương"
    ),
});

export type ContestantById = {
  id: number;
  roundId: number;
  studentId: number;
  round: { name: string };
  student: {
    fullName: string;
    studentCode: string | null;
    class: {
      id: number;
      name: string;
      school: {
        id: number;
        name: string;
      };
    };
  };
  status: ContestantStatus;
};

export type CreateContestantInput = z.infer<typeof CreateContestantSchema>;
export type ContestantIdParams = z.infer<typeof ContestantIdShame>;
export type UpdateContestantInput = z.infer<typeof UpdateContestantSchema>;
export type ContestantQueryInput = z.infer<typeof ContestantQuerySchema>;
export type ContestantType = z.infer<typeof ContestantSchema>;
export type CreatesContestInput = z.infer<typeof CreatesContestShema>;
export type ContestantMatchParams = z.infer<typeof ContestantMatchParamsSchema>;
export type ContestantDetailParams = z.infer<typeof ContestantDetailParamsSchema>;

// Schema cho query params của API getContestantsInMatch
export const GetContestantsInMatchQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val)).optional().default("1"),
  limit: z.string().transform(val => parseInt(val)).optional().default("10"),
  search: z.string().max(100).optional(),
  groupId: z.string().transform(val => parseInt(val)).optional(),
  schoolId: z.string().transform(val => parseInt(val)).optional(),
  classId: z.string().transform(val => parseInt(val)).optional(),
  roundId: z.string().transform(val => parseInt(val)).optional(),
  status: z.nativeEnum(ContestantStatus).optional(),
  schoolIds: z.preprocess(
    val => typeof val === "string" ? val.split(",").map(Number) : val,
    z.array(z.number()).optional()
  ),
  classIds: z.preprocess(
    val => typeof val === "string" ? val.split(",").map(Number) : val,
    z.array(z.number()).optional()
  ),
});

export type GetContestantsInMatchQuery = z.infer<typeof GetContestantsInMatchQuerySchema>;

// Schema cho API lấy danh sách thí sinh bị loại có phân trang, lọc, tìm kiếm
export const EliminatedContestantsFilterQuerySchema = z.object({
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
  schoolId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id trường học phải là số nguyên dương"
    )
    .optional(),
  classId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id lớp học phải là số nguyên dương"
    )
    .optional(),
  status: z.nativeEnum(ContestantStatus).optional(),
  registrationNumber: z
    .string()
    .transform(val => val === "" ? undefined : parseInt(val))
    .refine(
      val => val === undefined || (!isNaN(val) && Number.isInteger(val)),
      "Số báo danh phải là số nguyên"
    )
    .optional(),
});

export type EliminatedContestantsFilterQuery = z.infer<typeof EliminatedContestantsFilterQuerySchema>;

// Schema cho API cứu trợ hàng loạt
export const RescueManySchema = z.object({
  contestantIds: z.array(z.number().int().positive("ID thí sinh phải là số nguyên dương")).min(1, "Phải chọn ít nhất 1 thí sinh"),
  currentQuestionOrder: z.number().int().positive("Thứ tự câu hỏi phải là số nguyên dương"),
  rescueId: z.number().int().positive("ID rescue phải là số nguyên dương").optional(),
});

// Schema cho API thêm hàng loạt studentIds vào rescue (push, không trùng)
export const AddStudentsToRescueSchema = z.object({
  rescueId: z.number().int().positive("ID rescue phải là số nguyên dương"),
  studentIds: z.array(z.number().int().positive("ID sinh viên phải là số nguyên dương")).min(1, "Phải chọn ít nhất 1 sinh viên"),
});

// Schema cho API xóa 1 studentId khỏi rescue
export const RemoveStudentFromRescueSchema = z.object({
  rescueId: z.number().int().positive("ID rescue phải là số nguyên dương"),
  studentId: z.number().int().positive("ID sinh viên phải là số nguyên dương"),
});

// Schema cho API cập nhật trạng thái thành completed
export const UpdateToCompletedSchema = z.object({
  contestantIds: z.array(z.number().int().positive("ID thí sinh phải là số nguyên dương")).min(1, "Phải chọn ít nhất 1 thí sinh"),
});

// Schema cho API cập nhật trạng thái thành eliminated (từ completed về eliminated)
export const UpdateToEliminatedSchema = z.object({
  contestantIds: z.array(z.number().int().positive("ID thí sinh phải là số nguyên dương")).min(1, "Phải chọn ít nhất 1 thí sinh"),
});

export type RescueManyInput = z.infer<typeof RescueManySchema>;
export type AddStudentsToRescueInput = z.infer<typeof AddStudentsToRescueSchema>;
export type RemoveStudentFromRescueInput = z.infer<typeof RemoveStudentFromRescueSchema>;
export type UpdateToCompletedInput = z.infer<typeof UpdateToCompletedSchema>;
export type UpdateToEliminatedInput = z.infer<typeof UpdateToEliminatedSchema>;

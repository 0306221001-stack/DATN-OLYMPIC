import z from "zod";
import { RescueType, RescueStatus, Match } from "@prisma/client";

export const RescuesShema = z.object({
  id: z.number(),
  name: z.string(),
  rescueType: z.enum(["Hồi sinh", "Phao cứu sinh"]),
  questionFrom: z.number(),
  questionTo: z.number(),
  studentIds: z.any().optional(),
  supportAnswers: z.any().optional(),
  remainingContestants: z.number(),
  questionOrder: z.number().nullable(),
  index: z.number().optional(),
  status: z.enum(["Chưa sử dụng", "Đã sử dụng", "Đã qua"]),
  matchName: z.string(),
});

export const CreateRescuesShema = z.object({
  name: z
    .string({
      required_error: "Vui lòng nhập tên cứu trợ",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên cứu trợ")
    .max(255, "Tên cứu trợ tối đa 255 kí tự"),
  rescueType: z.nativeEnum(RescueType),
  questionFrom: z.number({
    required_error: "Vui lòng nhập câu bắt đầu",
    invalid_type_error: "Vui lòng nhập kí tự số",
  }),
  questionTo: z.number({
    required_error: "Vui lòng nhập câu kết thúc",
    invalid_type_error: "Vui lòng nhập kí tự số",
  }),
  studentIds: z.any(),
  supportAnswers: z.any(),
  remainingContestants: z.number({
    required_error: "Vui lòng nhập số thí sinh còn lại",
    invalid_type_error: "Vui lòng nhập kí tự số",
  }),
  matchId: z
    .number({
      required_error: "Vui lòng nhập id cuộc thi",
      invalid_type_error: "Id là một số nguyên",
    })
    .refine(
      val => !isNaN(val) && val > 0,
      "Id cuộc thi là một số nguyên dương"
    ),
  status: z.nativeEnum(RescueStatus),
  index: z.number().optional(),
});

export const RescuesIdShame = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const UpdateRescuesShema = z.object({
  name: z
    .string({
      required_error: "Vui lòng nhập tên cứu trợ",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên cứu trợ")
    .max(255, "Tên cứu trợ tối đa 255 kí tự")
    .optional(),
  rescueType: z.nativeEnum(RescueType).optional(),
  questionFrom: z
    .number({
      required_error: "Vui lòng nhập câu bắt đầu",
      invalid_type_error: "Vui lòng nhập kí tự số",
    })
    .optional(),
  questionTo: z
    .number({
      required_error: "Vui lòng nhập câu kết thúc",
      invalid_type_error: "Vui lòng nhập kí tự số",
    })
    .optional(),
  studentIds: z.any(),
  supportAnswers: z.array(z.string()).optional(),
  remainingContestants: z
    .number({
      required_error: "Vui lòng nhập số thí sinh còn lại",
      invalid_type_error: "Vui lòng nhập kí tự số",
    })
    .optional(),
  questionOrder: z
    .number({
      required_error: "Vui lòng nhập số thứ tự câu hỏi",
      invalid_type_error: "Vui lòng nhập kí tự số",
    })
    .optional(),
  matchId: z
    .number({
      required_error: "Vui lòng nhập id cuộc thi",
      invalid_type_error: "Id là một số nguyên",
    })
    .refine(val => !isNaN(val) && val > 0, "Id cuộc thi là một số nguyên dương")
    .optional(),
  status: z.nativeEnum(RescueStatus).optional(),
  index: z.number().optional(),
});

export const RescuesQuerySchema = z.object({
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
  rescueType: z.nativeEnum(RescueType).optional(),
  status: z.nativeEnum(RescueStatus).optional(),
  matchId: z
    .string()
    .transform(val => parseInt(val))
    .refine(
      val => !isNaN(val) && val > 0,
      "Id trận đấu phải là số nguyên dương"
    )
    .optional(),
});

export const SupportAnswerSchema = z.object({
  supportAnswers: z
    .string()
    .min(1, "Nội dung không được để trống")
    .max(500, "Nội dung tối đa 500 kí tự"),
});

export const deleteRescuesesSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export type RescuesById = {
  id: number;
  name: string;
  rescueType: RescueType;
  questionFrom: number;
  questionTo: number;
  studentIds?: any;
  supportAnswers?: any;
  remainingContestants: number;
  questionOrder: number | null;
  matchId: number;
  index: number | null;
  status: RescueStatus;
  match: { name: string };
};

// Schema mới cho việc cập nhật trạng thái rescue
export const UpdateRescueStatusSchema = z.object({
  matchId: z.number().int().positive("Match ID phải là số dương"),
  currentQuestionOrder: z.number().int().min(1, "Câu hỏi hiện tại phải >= 1"),
});

export type UpdateRescueStatusInput = z.infer<typeof UpdateRescueStatusSchema>;
export type CreateRescueInput = z.infer<typeof CreateRescuesShema>;
export type RescuesIdParams = z.infer<typeof RescuesIdShame>;
export type UpdateRescueInput = z.infer<typeof UpdateRescuesShema>;
export type RescuesQueryInput = z.infer<typeof RescuesQuerySchema>;
export type Rescues = z.infer<typeof RescuesShema>;

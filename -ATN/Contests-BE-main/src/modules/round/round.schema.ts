import z, { number } from "zod";
export const RoundShema = z.object({
  id: z.number(),
  name: z.string(),
  contestName: z.string(),
  isActive: z.boolean(),
  index: z.number(),
  endTime: z.date(),
  startTime: z.date(),
});

export const CreateRoundSchema = z
  .object({
    name: z
      .string({
        required_error: "Vui lòng nhập tên vòng đấu",
        invalid_type_error: "Vui lòng nhập kí tự chuỗi",
      })
      .min(1, "Vui lòng nhập tên vòng đấu")
      .max(255, "Tên vòng đấu tối đa 255 kí tự"),

    contestId: z
      .number({
        required_error: "Vui lòng nhập id cuộc thi",
        invalid_type_error: "Id là một số nguyên",
      })
      .int("Id cuộc thi phải là số nguyên")
      .positive("Id cuộc thi là một số nguyên dương"),

    startTime: z
      .string({
        required_error: "Vui lòng nhập ngày bắt đầu",
      })
      .refine(val => !isNaN(Date.parse(val)), {
        message: "Ngày bắt đầu không hợp lệ",
      })
      .transform(val => new Date(val)),

    endTime: z
      .string({
        required_error: "Vui lòng nhập ngày kết thúc",
      })
      .refine(val => !isNaN(Date.parse(val)), {
        message: "Ngày kết thúc không hợp lệ",
      })
      .transform(val => new Date(val)),

    index: z
      .number({
        required_error: "Vui lòng nhập thứ tự vòng đấu",
        invalid_type_error: "Thứ tự vòng đấu phải là số",
      })
      .int("Thứ tự vòng đấu phải là số nguyên")
      .min(1, "Thứ tự vòng đấu phải lớn hơn 0"),

    isActive: z.boolean(),
  })
  .refine(data => data.endTime > data.startTime, {
    path: ["endTime"],
    message: "Ngày kết thúc phải sau ngày bắt đầu",
  });

export const RoundIdShame = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const UpdeateRoundhema = z.object({
  name: z
    .string({
      required_error: "Vui lòng nhập tên vòng đấu",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên vòng đấu")
    .max(255, "Tên vòng đấu tối đa 255 kí tự")
    .optional(),
  contestId: z
    .number({
      required_error: "Vui lòng nhập id cuộc thi",
      invalid_type_error: "Id là một số nguyên",
    })
    .refine(val => !isNaN(val) && val > 0, "Id cuộc thi là một số nguyên dương")
    .optional(),
  startTime: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Ngày bắt đầu không hợp lệ",
    })
    .transform(val => new Date(val))
    .optional(),

  endTime: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Ngày kết thúc không hợp lệ",
    })
    .transform(val => new Date(val))
    .optional(),

  index: z.number().optional(),
  isActive: z.boolean().optional(),
});

export const RoundQuerySchema = z.object({
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
    .transform(val => val === "true")
    .optional(),
});

export const deleteRoundesSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export type RoundById = {
  id: number;
  name: string;
  contestId: number;
  contest: { name: string };
  index: number;
  isActive: boolean;
  startTime: Date;
  endTime: Date;
};
export type CreateRoundInput = z.infer<typeof CreateRoundSchema>;
export type RoundIdParams = z.infer<typeof RoundIdShame>;
export type UpdateRoundInput = z.infer<typeof UpdeateRoundhema>;
export type RoundQueryInput = z.infer<typeof RoundQuerySchema>;
export type Rounds = z.infer<typeof RoundShema>;

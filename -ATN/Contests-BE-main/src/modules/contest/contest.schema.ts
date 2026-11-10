import z, { number } from "zod";
import { ContestStatus } from "@prisma/client";

export const ContestsIdShame = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const CreateContestsSchema = z.object({
  name: z.string().min(1, "Tên cuộc thi là bắt buộc"),
  slug: z.string().min(1, "Slug là bắt buộc").optional(),
  rule: z.string().min(1, "Nội dung luật là bắt buộc"),
  plainText: z.string().min(1, "Mô tả ngắn là bắt buộc").optional(),
  location: z.string().min(1, "Địa điểm là bắt buộc"),
  startTime: z.coerce.date().refine(date => !isNaN(date.getTime()), {
    message: "Ngày bắt đầu không hợp lệ",
  }),
  endTime: z.coerce.date().refine(date => !isNaN(date.getTime()), {
    message: "Ngày kết thúc không hợp lệ",
  }),
  status: z.nativeEnum(ContestStatus).optional(),
  slogan: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const UpdateContestsSchema = z.object({
  name: z.string().min(1, "Tên cuộc thi là bắt buộc").optional(),
  slug: z.string().min(1, "Slug là bắt buộc").optional(),
  rule: z.string().min(1, "Nội dung luật là bắt buộc").optional(),
  plainText: z.string().min(1, "Mô tả ngắn là bắt buộc").optional(),
  location: z.string().min(1, "Địa điểm là bắt buộc").optional(),
  startTime: z.coerce
    .date()
    .refine(date => !isNaN(date.getTime()), {
      message: "Ngày bắt đầu không hợp lệ",
    })
    .optional(),
  endTime: z.coerce
    .date()
    .refine(date => !isNaN(date.getTime()), {
      message: "Ngày kết thúc không hợp lệ",
    })
    .optional(),
  status: z.nativeEnum(ContestStatus).optional(),
  slogan: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const ContestsQuerySchema = z.object({
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
  status: z.nativeEnum(ContestStatus).optional(),
});

export const deleteContestsesSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export type ContestsIdParams = z.infer<typeof ContestsIdShame>;
export type UpdateContestInput = z.infer<typeof UpdateContestsSchema>;
export type ContestQueryInput = z.infer<typeof ContestsQuerySchema>;
export type CreateContestInput = {
  name: string;
  slug: string;
  rule: string;
  plainText: string;
  location: string;
  startTime: Date | string;
  endTime: Date | string;
  slogan: string;
  status: ContestStatus;
  isActive?: boolean;
};

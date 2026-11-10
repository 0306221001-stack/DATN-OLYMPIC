import z from "zod";
export const CreateClassVideoShema = z.object({
  name: z.string().min(1, "Tên video không được để trống"),
  slogan: z.string().optional(),
  classId: z.coerce.number().min(1, "Class ID phải là số nguyên dương"),
  contestId: z.coerce.number().min(1, "Contest ID phải là số nguyên dương"),

  videos: z.string().min(1, "Video không được để trống"),
});

export const ClassVideoIdSchema = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const UpdateClassVideoSchema = z.object({
  name: z.string().min(1, "Tên video không được để trống").optional(),
  slogan: z.string().optional(),
  classId: z.coerce
    .number()
    .min(1, "Class ID phải là số nguyên dương")
    .optional(),
  contestId: z.coerce
    .number()
    .min(1, "Contest ID phải là số nguyên dương")
    .optional(),

  videos: z.string().min(1, "Video không được để trống").optional(),
});

export const deleteClassVideosSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export const CreateClassVideoSchema = z.object({
  name: z.string().min(1, "Tên video không được để trống"),
  slogan: z.string().optional(),
  classId: z.coerce
    .number({ required_error: "Class ID không được để trống" })
    .min(1, "Class ID phải là số nguyên dương"),
});

export const ClassVideoQuerySchema = z.object({
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
});

export const ClassVideoSchema = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
  name: z.string().min(1, "Tên video không được để trống"),
  slogan: z.string().nullable(),
  classId: z.coerce.number().min(1, "Class ID phải là số nguyên dương"),
  videos: z.string().min(1, "Video không được để trống"),
  className: z.string().optional(),
});

export type CreateClassVideoInput = z.infer<typeof CreateClassVideoShema>;
export type ClassVideoIdParams = z.infer<typeof ClassVideoIdSchema>;
export type UpdateClassVideoInput = z.infer<typeof UpdateClassVideoSchema>;
export type ClassVideoQueryInput = z.infer<typeof ClassVideoQuerySchema>;
export type DeleteClassVideosInput = z.infer<typeof deleteClassVideosSchema>;
export type ClassVideo = z.infer<typeof ClassVideoSchema>;

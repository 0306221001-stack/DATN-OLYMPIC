import z from "zod";
export const ClassShema = z.object({
  id: z.number(),
  name: z.string(),
  isActive: z.boolean(),
  shoolName: z.string(),
});

export const CreateClassShema = z.object({
  name: z
    .string({
      required_error: "Vui lòng nhập tên lớp",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên lớp")
    .max(255, "Tên lớp tối đa 255 kí tự"),
  schoolId: z
    .number({
      required_error: "Vui lòng nhập id trường",
      invalid_type_error: "Id là một số nguyên",
    })
    .refine(val => !NaN && val > 0, "Id trường là một số nguyên dương"),
  isActive: z.boolean().optional(),
});

export const ClassIdShame = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const UpdeateClasshema = z.object({
  name: z
    .string({
      required_error: "Vui lòng nhập tên lớp",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập tên lớp")
    .max(255, "Tên lớp tối đa 255 kí tự")
    .optional(),
  isActive: z.boolean().optional(),
  schoolId: z
    .number({
      required_error: "Vui lòng nhập id trường",
      invalid_type_error: "Id trường là một số nguyên",
    })
    .refine(val => !NaN && val > 0, "Id trường là một số nguyên dương")
    .optional(),
});

export const ClassQuerySchema = z.object({
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
  schoolId: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id lớp phải là số nguyên dương")
    .optional(),
});

export const deleteClassesSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export type ClassById = {
  id: number;
  name: string;
  schoolId: number;
  school: { name: string };
  isActive: boolean;
};
export type CreateClassInput = z.infer<typeof CreateClassShema>;
export type ClassIdParams = z.infer<typeof ClassIdShame>;
export type UpdateClassInput = z.infer<typeof UpdeateClasshema>;
export type ClassQueryInput = z.infer<typeof ClassQuerySchema>;
export type Classes = z.infer<typeof ClassShema>;

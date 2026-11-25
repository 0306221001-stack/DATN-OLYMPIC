import z from "zod";
export const CreateSchoolSchema = z.object({
  name: z
    .string({
      required_error: "Vui lòng nhập tên trường",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(5, "Tên trường ít nhất 5 kí  tự ")
    .max(255, "Tên trường tối đa 255 kí tự"),
  email: z
    .string({
      required_error: "Vui lòng nhập tên eamil",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập email")
    .max(255, "Tên email tối đa 255 kí tự")
    .email("Vui lòng nhập đúng định dạng emaill"),
  phone: z
    .string({
      required_error: "Vui lòng nhập số điên thoại",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(10, "Số điện thoại phải có 10 số")
    .max(10, "Số điện thoại phải có 10 số"),
  address: z
    .string({
      required_error: "Vui lòng nhập địa chỉ",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập địa chỉ")
    .max(255, "Địa chỉ tối đa 255 kí tự"),
});

export const SchoolIdShame = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const UpdeateSchoolShema = z.object({
  name: z
    .string({
      required_error: "Vui lòng nhập tên trường",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(5, "Tên trường ít nhất 5 kí  tự ")
    .max(255, "Tên trường tối đa 255 kí tự")
    .optional(),
  email: z
    .string({
      required_error: "Vui lòng nhập tên eamil",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập email")
    .max(255, "Tên email tối đa 255 kí tự")
    .email("Vui lòng nhập đúng định dạng emaill")
    .optional(),
  phone: z
    .string({
      required_error: "Vui lòng nhập số điên thoại",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(10, "Số điện thoại phải có 10 số")
    .max(10, "Số điện thoại phải có 10 số")
    .optional(),
  address: z
    .string({
      required_error: "Vui lòng nhập địa chỉ",
      invalid_type_error: "Vui lòng nhập kí tự chuỗi",
    })
    .min(1, "Vui lòng nhập địa chỉ")
    .max(255, "Địa chỉ tối đa 255 kí tự")
    .optional(),
  isActive: z.boolean().optional(),
});

export const SchoolQuerySchema = z.object({
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
  search: z
    .string()
    .min(2, "Từ khóa tìm kiếm phải có ít nhất 2 ký tự")
    .max(100, "Từ khóa tìm kiếm tối đa 100 ký tự")
    .optional(),
  isActive: z
    .string()
    .optional()
    .transform(val => val === "true")
    .optional(),
});

export const deleteSchoolsSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export type CreateSchoolInput = z.infer<typeof CreateSchoolSchema>;
export type SchoolIdParams = z.infer<typeof SchoolIdShame>;
export type UpdateShoolInput = z.infer<typeof UpdeateSchoolShema>;
export type SchoolQueryInput = z.infer<typeof SchoolQuerySchema>;

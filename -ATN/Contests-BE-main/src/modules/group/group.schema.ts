import z, { number, string } from "zod";

export const GroupShema = z.object({
  id: z.number(),
  name: z.string(),
  userName: z.string(),
  matchName: z.string(),
  confirmCurrentQuestion: z.number(),
});

export const CreateGroupsSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên nhóm"),
  userId: z.number(),
  matchId: z.number(),
  confirmCurrentQuestion: z.number(),
});

export const GroupsIdShema = z.object({
  id: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id là 1 số nguyên dương "),
});

export const UpdateGroupsSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên nhóm").optional(),
  userId: z.number().optional(),
  matchId: z.number().optional(),
  confirmCurrentQuestion: z.number().optional(),
});

export const GroupsQuerySchema = z.object({
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
  matchId: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id lớp phải là số nguyên dương")
    .optional(),
  userId: z
    .string()
    .transform(val => parseInt(val))
    .refine(val => !isNaN(val) && val > 0, "Id lớp phải là số nguyên dương")
    .optional(),
});

export const CreateBulkGroupsSchema = z.object({
  matchId: z.number({
    required_error: "Match ID là bắt buộc",
    invalid_type_error: "Match ID phải là số",
  }).int().positive("Match ID phải là số nguyên dương"),
  groupNames: z.array(z.string().min(1, "Tên nhóm không được rỗng"))
    .min(1, "Phải có ít nhất 1 tên nhóm")
    .max(50, "Không thể tạo quá 50 nhóm cùng lúc")
    .refine(
      (names) => {
        const trimmedNames = names.map(name => name.trim());
        const uniqueNames = new Set(trimmedNames);
        return uniqueNames.size === trimmedNames.length;
      },
      {
        message: "Không được có tên nhóm trùng lặp"
      }
    )
});

export type GroupByIdType = {
  id: number;
  name: string;
  confirmCurrentQuestion: number;
  matchId: number;
  userId: number | null;
  user: { username: string } | null;
  match: { name: string };
};

export const deleteGroupsesSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải chọn ít nhất 1 ID để xoá"),
});

export type GroupsIdParams = z.infer<typeof GroupsIdShema>;
export type UpdateGroupInput = z.infer<typeof UpdateGroupsSchema>;
export type GroupQueryInput = z.infer<typeof GroupsQuerySchema>;
export type CreateGroupInput = z.infer<typeof CreateGroupsSchema>;
export type CreateBulkGroupsInput = z.infer<typeof CreateBulkGroupsSchema>;
export type GrouType = z.infer<typeof GroupShema>;

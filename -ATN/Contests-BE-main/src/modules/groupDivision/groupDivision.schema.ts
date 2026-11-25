import { z } from "zod";

// Schema cho việc chia nhóm
export const divideGroupsSchema = z.object({
  groups: z.array(
    z.object({
      judgeId: z.number().positive("Judge ID phải là số dương"),
      groupName: z.string().optional(),
      contestantIds: z.array(z.number().positive("Contestant ID phải là số dương"))
    })
  ).min(1, "Phải có ít nhất 1 nhóm")
});

// Schema cho việc lấy danh sách thí sinh có thể tham gia
export const getAvailableContestantsSchema = z.object({
  roundId: z.number().optional(),
  status: z.enum(["compete", "eliminate", "advanced"]).optional(),
  schoolId: z.number().optional(),
  classId: z.number().optional(),
  search: z.string().optional(),
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(20)
});

// Schema cho việc lấy danh sách trọng tài
export const getAvailableJudgesSchema = z.object({
  search: z.string().optional(),
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(50)
});

// Schema cho việc phân bổ thí sinh vào nhóm đã có sẵn
export const assignContestantsToGroupsSchema = z.object({
  groups: z.array(
    z.object({
      groupId: z.number().positive("Group ID phải là số dương"),
      contestantIds: z.array(z.number().positive("Contestant ID phải là số dương"))
    })
  ).min(1, "Phải có ít nhất 1 nhóm")
});

export const CreateGroupsSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên nhóm"),
  userId: z.number().optional(), // <-- sửa thành optional
  matchId: z.number(),
  confirmCurrentQuestion: z.number(),
});

export type DivideGroupsInput = z.infer<typeof divideGroupsSchema>;
export type GetAvailableContestantsInput = z.infer<typeof getAvailableContestantsSchema>;
export type GetAvailableJudgesInput = z.infer<typeof getAvailableJudgesSchema>;
export type AssignContestantsToGroupsInput = z.infer<typeof assignContestantsToGroupsSchema>;
export type CreateGroupsInput = z.infer<typeof CreateGroupsSchema>;

// Types cho response
export interface ContestantInfo {
  id: number;
  student: {
    id: number;
    fullName: string;
    studentCode: string;
    class: {
      id: number;
      name: string;
      school: {
        id: number;
        name: string;
      };
    };
  };
  status: string;
  roundId: number;
}

export interface JudgeInfo {
  id: number;
  username: string;
  email: string;
}

export interface GroupInfo {
  id: number;
  name: string;
  userId: number | null;
  judge: {
    id: number;
    username: string;
    email: string;
  } | null;
  contestantMatches: Array<{
    contestant: {
      id: number;
      student: {
        id: number;
        fullName: string;
        studentCode: string;
      };
    };
    registrationNumber: number;
  }>;
}

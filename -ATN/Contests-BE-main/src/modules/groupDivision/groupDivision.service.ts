import { prisma } from "@/config/database";
import { ContestantStatus, Role } from "@prisma/client";
import {
  DivideGroupsInput,
  GetAvailableContestantsInput,
  GetAvailableJudgesInput,
  ContestantInfo,
  JudgeInfo,
  GroupInfo,
} from "./groupDivision.schema";

export default class GroupDivisionService {
  /**
   * Lấy danh sách thí sinh có thể tham gia trận đấu
   */
  static async getAvailableContestants(
    matchId: number,
    query: GetAvailableContestantsInput
  ) {
    const { roundId, status, schoolId, classId, search, page, limit } = query;

    // Lấy thông tin trận đấu
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { round: true },
    });

    if (!match) {
      throw new Error("Không tìm thấy trận đấu");
    }

    // Điều kiện lọc
    const whereConditions: any = {
      contestId: match.round.contestId,
      ...(roundId ? { roundId } : { roundId: match.roundId }),
      ...(status
        ? { status: status as ContestantStatus }
        : { status: "compete" }),
    }; // Điều kiện tìm kiếm theo tên hoặc mã sinh viên
    if (search) {
      whereConditions.student = {
        OR: [
          { fullName: { contains: search } },
          { studentCode: { contains: search } },
        ],
      };
    }

    // Lọc theo trường học
    if (schoolId) {
      whereConditions.student = {
        ...whereConditions.student,
        class: {
          schoolId,
        },
      };
    }

    // Lọc theo lớp
    if (classId) {
      whereConditions.student = {
        ...whereConditions.student,
        classId,
      };
    }

    // Đếm tổng số thí sinh
    const total = await prisma.contestant.count({
      where: whereConditions,
    });

    // Lấy danh sách thí sinh với phân trang
    const contestants = await prisma.contestant.findMany({
      where: whereConditions,
      include: {
        student: {
          include: {
            class: {
              include: {
                school: true,
              },
            },
          },
        },
      },
      orderBy: [{ student: { fullName: "asc" } }],
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      contestants: contestants as ContestantInfo[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy danh sách trọng tài có thể chấm thi
   */
  static async getAvailableJudges(query: GetAvailableJudgesInput) {
    const { search, page, limit } = query;

    const whereConditions: any = {
      role: Role.Judge,
      isActive: true,
    };

    if (search) {
      whereConditions.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await prisma.user.count({
      where: whereConditions,
    });

    const judges = await prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        username: true,
        email: true,
      },
      orderBy: { username: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      judges: judges as JudgeInfo[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy danh sách nhóm hiện tại của trận đấu
   */
  static async getCurrentGroups(matchId: number): Promise<GroupInfo[]> {
    const groups = await prisma.group.findMany({
      where: { matchId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        contestantMatches: {
          include: {
            contestant: {
              include: {
                student: {
                  select: {
                    id: true,
                    fullName: true,
                    studentCode: true,
                  },
                },
                round: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { registrationNumber: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
    return groups.map(group => ({
      id: group.id,
      name: group.name,
      userId: group.userId,
      judge: group.user
        ? {
            id: group.user.id,
            username: group.user.username,
            email: group.user.email,
          }
        : null,
      contestantMatches: group.contestantMatches.map((cm: any) => ({
        contestant: {
          id: cm.contestant.id,
          student: {
            id: cm.contestant.student.id,
            fullName: cm.contestant.student.fullName,
            studentCode: cm.contestant.student.studentCode,
          },
          round: {
            id: cm.contestant.round.id,
            name: cm.contestant.round.name,
          },
        },
        registrationNumber: cm.registrationNumber,
      })),
    }));
  }

  /**
   * Lấy danh sách nhóm hiện tại của trận đấu (không sắp xếp - dành cho frontend)
   * Trả về theo thứ tự tự nhiên của database để frontend tự quản lý thứ tự
   */
  static async getCurrentGroupsUnsorted(matchId: number): Promise<GroupInfo[]> {
    const groups = await prisma.group.findMany({
      where: { matchId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        contestantMatches: {
          include: {
            contestant: {
              include: {
                student: {
                  select: {
                    id: true,
                    fullName: true,
                    studentCode: true,
                  },
                },
                round: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { registrationNumber: "asc" },
        },
      },
      // Không có orderBy - trả về theo thứ tự tự nhiên của database (tăng dần theo id/createdAt)
    });

    return groups.map(group => ({
      id: group.id,
      name: group.name,
      userId: group.userId,
      judge: group.user
        ? {
            id: group.user.id,
            username: group.user.username,
            email: group.user.email,
          }
        : null,
      contestantMatches: group.contestantMatches.map((cm: any) => ({
        contestant: {
          id: cm.contestant.id,
          student: {
            id: cm.contestant.student.id,
            fullName: cm.contestant.student.fullName,
            studentCode: cm.contestant.student.studentCode,
          },
          round: {
            id: cm.contestant.round.id,
            name: cm.contestant.round.name,
          },
        },
        registrationNumber: cm.registrationNumber,
      })),
    }));
  }

  /**
   * Chia nhóm thí sinh cho trận đấu
   */
  static async divideGroups(matchId: number, input: DivideGroupsInput) {
    return await prisma.$transaction(async tx => {
      // 1. Kiểm tra trận đấu có tồn tại không
      const match = await tx.match.findUnique({
        where: { id: matchId },
      });

      if (!match) {
        throw new Error("Không tìm thấy trận đấu");
      }

      // 2. Xóa dữ liệu cũ (Groups và ContestantMatches)
      await tx.contestantMatch.deleteMany({
        where: { matchId },
      });

      await tx.group.deleteMany({
        where: { matchId },
      });

      // 3. Tạo các nhóm mới
      const createdGroups = [];
      let registrationNumber = 1;

      for (let i = 0; i < input.groups.length; i++) {
        const groupData = input.groups[i];

        // Kiểm tra trọng tài có tồn tại và có role Judge không
        const judge = await tx.user.findFirst({
          where: {
            id: groupData.judgeId,
            role: Role.Judge,
            isActive: true,
          },
        });

        if (!judge) {
          throw new Error(
            `Không tìm thấy trọng tài với ID ${groupData.judgeId}`
          );
        }

        // Tạo nhóm
        const groupName =
          groupData.groupName || `Nhóm ${String.fromCharCode(65 + i)}`; // A, B, C...

        const createdGroup = await tx.group.create({
          data: {
            name: groupName,
            userId: groupData.judgeId,
            matchId: matchId,
            confirmCurrentQuestion: 0,
          },
        });

        // Tạo ContestantMatches cho nhóm này
        for (let j = 0; j < groupData.contestantIds.length; j++) {
          const contestantId = groupData.contestantIds[j];

          // Kiểm tra thí sinh có tồn tại không
          const contestant = await tx.contestant.findUnique({
            where: { id: contestantId },
          });

          if (!contestant) {
            throw new Error(`Không tìm thấy thí sinh với ID ${contestantId}`);
          }

          await tx.contestantMatch.create({
            data: {
              contestantId,
              matchId,
              groupId: createdGroup.id,
              registrationNumber: registrationNumber++, // Số thứ tự trong nhóm
              status: "not_started",
            },
          });
        }

        createdGroups.push(createdGroup);
      }

      return createdGroups;
    });
  }

  /**
   * Tạo nhóm mới trong trận đấu
   */
  static async createGroup(
    matchId: number,
    groupName: string,
    judgeId?: number
  ): Promise<any> {
    return await prisma.$transaction(async tx => {
      // 1. Kiểm tra trận đấu có tồn tại không
      const match = await tx.match.findUnique({
        where: { id: matchId },
      });

      if (!match) {
        throw new Error("Không tìm thấy trận đấu");
      }

      // Nếu có judgeId thì kiểm tra, nếu không thì bỏ qua
      let judge = null;
      if (judgeId) {
        judge = await tx.user.findFirst({
          where: {
            id: judgeId,
            role: Role.Judge,
            isActive: true,
          },
        });

        if (!judge) {
          throw new Error(`Không tìm thấy trọng tài với ID ${judgeId}`);
        }

        // Kiểm tra trọng tài có bị trùng trong cùng trận đấu không
        const existingGroupInMatch = await tx.group.findFirst({
          where: {
            userId: judgeId,
            matchId: matchId,
          },
        });

        if (existingGroupInMatch) {
          throw new Error(
            `Trọng tài ${judge.username} đã được phân vào nhóm ${existingGroupInMatch.name} trong trận đấu này`
          );
        }

        // Kiểm tra trọng tài có bị trùng thời gian với trận khác không
        const conflictGroup = await tx.group.findFirst({
          where: {
            userId: judgeId,
            NOT: { matchId: matchId },
            match: {
              AND: [
                { startTime: { lt: match.endTime } },
                { endTime: { gt: match.startTime } },
              ],
            },
          },
          include: { match: true },
        });

        if (conflictGroup) {
          throw new Error(
            `Trọng tài ${judge.username} đang có nhóm khác ở trận '${conflictGroup.match.name}' trùng thời gian`
          );
        }
      }

      // 5. Tạo nhóm mới (userId có thể là undefined)
      const newGroup = await tx.group.create({
        data: {
          name: groupName,
          userId: judgeId ?? null, // <-- nếu không có thì null
          matchId: matchId,
          confirmCurrentQuestion: 0,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      return newGroup;
    });
  }

  /**
   * Xóa nhóm và tất cả thí sinh trong nhóm
   */
  static async deleteGroup(groupId: number): Promise<any> {
    return await prisma.$transaction(async tx => {
      // 1. Kiểm tra nhóm có tồn tại không
      const group = await tx.group.findUnique({
        where: { id: groupId },
        include: {
          contestantMatches: true,
        },
      });

      if (!group) {
        throw new Error("Không tìm thấy nhóm");
      }

      // 2. Xóa tất cả thí sinh trong nhóm trước
      await tx.contestantMatch.deleteMany({
        where: { groupId: groupId },
      });

      // 3. Xóa nhóm
      const deletedGroup = await tx.group.delete({
        where: { id: groupId },
      });

      return {
        deletedGroup,
        deletedContestantsCount: group.contestantMatches.length,
      };
    });
  }

  /**
   * Xóa nhiều nhóm cùng lúc
   */
  static async deleteAllGroups(groupIds: number[]): Promise<any> {
    return await prisma.$transaction(async tx => {
      // 1. Kiểm tra tất cả nhóm có tồn tại không
      const groups = await tx.group.findMany({
        where: { id: { in: groupIds } },
        include: {
          contestantMatches: true,
        },
      });

      if (groups.length !== groupIds.length) {
        throw new Error("Một số nhóm không tồn tại");
      }

      // 2. Xóa tất cả thí sinh trong các nhóm
      const totalContestants = await tx.contestantMatch.deleteMany({
        where: { groupId: { in: groupIds } },
      });

      // 3. Xóa tất cả nhóm
      const deletedGroups = await tx.group.deleteMany({
        where: { id: { in: groupIds } },
      });

      return {
        deletedGroupsCount: deletedGroups.count,
        deletedContestantsCount: totalContestants.count,
      };
    });
  }

  /**
   * Cập nhật tên nhóm
   */
  static async updateGroupName(groupId: number, newName: string): Promise<any> {
    // Kiểm tra nhóm có tồn tại không
    const existingGroup = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!existingGroup) {
      throw new Error("Không tìm thấy nhóm");
    }

    // Cập nhật tên nhóm
    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: { name: newName },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return updatedGroup;
  }

  /**
   * Lấy danh sách trường học để lọc
   */
  static async getSchools() {
    return await prisma.school.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Lấy danh sách lớp học theo trường để lọc
   */
  static async getClassesBySchool(schoolId: number) {
    return await prisma.class.findMany({
      where: {
        schoolId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });
  }

  static async getContestantByJudgeIdAndMatchId(
    judgeId: number,
    matchId: number
  ) {
    return prisma.contestantMatch.findMany({
      where: {
        matchId: matchId,
        group: {
          userId: judgeId,
        },
      },
      select: {
        registrationNumber: true,
        status: true,
        match: {
          select: {
            maxContestantColumn: true,
          },
        },
      },
      orderBy: {
        registrationNumber: "asc",
      },
    });
  }

  static async UpdateContestantMatchStatus(
    contestantMatchId: number,
    status:
      | "not_started"
      | "in_progress"
      | "confirmed1"
      | "confirmed2"
      | "eliminated"
      | "rescued"
      | "banned"
      | "completed",
    ids: number[] = [],
    questionOrder?: number
  ) {
    console.log(
      "Match:",
      contestantMatchId,
      "Status:",
      status,
      "IDs:",
      ids,
      "Question Order:",
      questionOrder
    );
    if (status === "eliminated") {
      return await prisma.contestantMatch.updateMany({
        where: { matchId: contestantMatchId, registrationNumber: { in: ids } },
        data: { status, eliminatedAtQuestionOrder: questionOrder },
      });
    } else if (status === "rescued") {
      const result = await prisma.contestantMatch.updateMany({
        where: { matchId: contestantMatchId, registrationNumber: { in: ids } },
        data: { status, rescuedAtQuestionOrder: questionOrder },
      });
      // Trả trạng thái cấp cuộc thi từ "eliminate" về "compete"
      const rescued = await prisma.contestantMatch.findMany({
        where: { matchId: contestantMatchId, registrationNumber: { in: ids } },
        select: { contestantId: true },
      });
      await prisma.contestant.updateMany({
        where: { id: { in: rescued.map(r => r.contestantId) } },
        data: { status: "compete" },
      });
      return result;
    } else {
      return await prisma.contestantMatch.updateMany({
        where: { matchId: contestantMatchId, registrationNumber: { in: ids } },
        data: { status },
      });
    }
  }

  /**
   * Phân bổ thí sinh vào các nhóm đã có sẵn (theo groupId, contestantIds)
   */
  static async assignContestantsToGroups(
    matchId: number,
    input: import("./groupDivision.schema").AssignContestantsToGroupsInput
  ) {
    return await prisma.$transaction(async tx => {
      // Xóa contestantMatch cũ của các groupId này
      const groupIds = input.groups.map(g => g.groupId);
      await tx.contestantMatch.deleteMany({
        where: { groupId: { in: groupIds } },
      });

      let registrationNumber = 1;

      // Tạo lại contestantMatch mới
      for (const group of input.groups) {
        for (let i = 0; i < group.contestantIds.length; i++) {
          await tx.contestantMatch.create({
            data: {
              groupId: group.groupId,
              contestantId: group.contestantIds[i],
              matchId,

              registrationNumber: registrationNumber++,
            },
          });
        }
      }
      return { success: true };
    });
  }

  static async UpdateContestantStatusEliminated(
    matchId: number,
    questionOrder: number
  ) {
    return await prisma.contestantMatch.updateMany({
      where: {
        matchId: matchId,
        status: "confirmed2",
      },
      data: {
        status: "eliminated",
        eliminatedAtQuestionOrder: questionOrder,
      },
    });
  }

  static async getContestantMatchByStatus(
    matchId: number,
    status:
      | "not_started"
      | "in_progress"
      | "confirmed1"
      | "confirmed2"
      | "eliminated"
      | "rescued"
      | "banned"
      | "completed",
    questionOrder?: number
  ) {
    if (questionOrder === undefined) {
      return await prisma.contestantMatch.findMany({
        where: {
          matchId: matchId,
          status: status,
        },
        select: {
          contestantId: true,
        },
      });
    } else {
      return await prisma.contestantMatch.findMany({
        where: {
          matchId: matchId,
          status: status,
          eliminatedAtQuestionOrder: questionOrder,
        },
        select: {
          contestantId: true,
        },
      });
    }
  }

  static async getIdsByStatus(matchId: number) {
    return await prisma.contestantMatch.findMany({
      where: {
        matchId: matchId,
        status: "rescued",
      },
      select: {
        contestantId: true,
        registrationNumber: true,
      },
    });
  }

  static async UpdateContestantStatusByIds(matchId: number) {
    return await prisma.contestantMatch.updateMany({
      where: {
        matchId: matchId,
        status: "rescued",
      },
      data: {
        status: "in_progress",
      },
    });
  }

  static async ExportExcel(matchId: number) {
    return await prisma.contestantMatch.findMany({
      where: { matchId },
      select: {
        contestant: {
          select: {
            student: {
              select: {
                fullName: true,
                studentCode: true,
                class: {
                  select: {
                    name: true,
                    school: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        status: true,
        registrationNumber: true,
        match: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        registrationNumber: "asc",
      },
    });
  }

  static async UpdateStatusGold(matchId: number, registrationNumber: number) {
    return await prisma.contestantMatch.updateMany({
      where: {
        matchId: matchId,
        status: { not: { in: ["banned"] } },
        registrationNumber: { not: registrationNumber },
      },
      data: {
        status: "eliminated",
      },
    });
  }
}

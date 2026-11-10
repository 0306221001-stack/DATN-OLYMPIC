import { prisma } from "@/config/database";
import {
  CreateContestantInput,
  UpdateContestantInput,
  ContestantQueryInput,
  ContestantType,
  ContestantById,
} from "@/modules/contestant";
import { Contestant } from "@prisma/client";
import { group } from "console";

export default class ContestantService {
  static async getAll(
    query: ContestantQueryInput,
    contestId: number
  ): Promise<{
    contestantes: ContestantType[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const {
      page,
      limit,
      search,
      roundId,
      status,
      schoolId,
      classId,
      groupId,
      matchId,
      schoolIds,
      classIds,
    } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (contestId !== undefined) {
      whereClause.contestId = contestId;
    }

    if (typeof roundId === "number" && !isNaN(roundId) && roundId > 0) {
      whereClause.roundId = roundId;
    }

    if (status !== undefined) {
      whereClause.status = status;
    }

    // Filter by school ID
    if (schoolId !== undefined) {
      whereClause.student = {
        ...whereClause.student,
        class: {
          ...whereClause.student?.class,
          schoolId: schoolId,
        },
      };
    }

    // Filter by class ID
    if (classId !== undefined) {
      whereClause.student = {
        ...whereClause.student,
        classId: classId,
      };
    }

    // Filter by group ID
    if (groupId !== undefined && matchId) {
      if (groupId === -1) {
        // Filter for contestants not assigned to any group in this specific match
        whereClause.contestantMatches = {
          none: {
            matchId: matchId,
          },
        };
      } else if (groupId > 0) {
        // Filter for contestants in specific group within this specific match
        whereClause.contestantMatches = {
          some: {
            matchId: matchId,
            groupId: groupId,
          },
        };
      }
    }

    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { contest: { is: { name: { contains: keyword } } } },
        { student: { is: { fullName: { contains: keyword } } } },
        { round: { is: { name: { contains: keyword } } } },
        {
          student: {
            is: {
              class: {
                is: { school: { is: { name: { contains: keyword } } } },
              },
            },
          },
        },
        { student: { is: { class: { is: { name: { contains: keyword } } } } } },
      ]);
    }

    if (schoolIds && schoolIds.length > 0 && classIds && classIds.length > 0) {
      // Lọc theo cả trường và lớp
      whereClause.student = {
        class: {
          schoolId: { in: schoolIds },
          id: { in: classIds },
        },
      };
    } else if (schoolIds && schoolIds.length > 0) {
      // Chỉ lọc theo trường
      whereClause.student = {
        class: {
          schoolId: { in: schoolIds },
        },
      };
    } else if (classIds && classIds.length > 0) {
      // Chỉ lọc theo lớp
      whereClause.student = {
        class: {
          id: { in: classIds },
        },
      };
    }

    const ContestantRaw = await prisma.contestant.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        student: {
          select: {
            fullName: true,
            studentCode: true,
            class: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
        contestantMatches: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          where: matchId
            ? {
              matchId: matchId,
            }
            : undefined,
        },
      },
    });
    const Contestantes = ContestantRaw.map(key => ({
      id: key.id,
      fullName: key.student.fullName,
      studentCode: key.student.studentCode,
      roundName: key.round.name,
      status: key.status,
      schoolId: key.student.class.school.id,
      schoolName: key.student.class.school.name,
      classId: key.student.class.id,
      className: key.student.class.name,
      groupId: key.contestantMatches[0]?.group?.id || null,
      groupName: key.contestantMatches[0]?.group?.name || null,
    }));

    const total = await prisma.contestant.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      contestantes: Contestantes,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async getContestantBy(data: any): Promise<ContestantById | null> {
    return prisma.contestant.findFirst({
      where: {
        ...data,
      },
      select: {
        id: true,
        roundId: true,
        studentId: true,
        status: true,
        student: {
          select: {
            fullName: true,
            studentCode: true,
            class: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static async create(data: CreateContestantInput): Promise<Contestant | null> {
    return prisma.contestant.create({
      data: {
        ...data,
      },
    });
  }

  static async update(
    id: number,
    data: UpdateContestantInput
  ): Promise<Contestant | null> {
    const updateData: any = {};

    if (data.roundId !== undefined) {
      updateData.roundId = data.roundId;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    return prisma.contestant.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }

  static async deleteContestant(id: number): Promise<Contestant> {
    // Mọi khóa ngoại tới thí sinh đều Restrict: xóa kết quả và lượt tham gia
    // trận trước. Giải thưởng thuộc về trận nên chỉ bỏ gán thí sinh.
    const [, , , contestant] = await prisma.$transaction([
      prisma.result.deleteMany({ where: { contestantId: id } }),
      prisma.contestantMatch.deleteMany({ where: { contestantId: id } }),
      prisma.award.updateMany({
        where: { contestantId: id },
        data: { contestantId: null },
      }),
      prisma.contestant.delete({ where: { id } }),
    ]);
    return contestant;
  }

  static async getAllNotConstest(
    query: ContestantQueryInput,
    idContest: number
  ): Promise<{
    contestantes: ContestantType[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page = 1, limit = 10, search, roundId, status, contestId } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (roundId) whereClause.roundId = roundId;
    if (status) whereClause.status = status;

    // Tìm kiếm theo tên cuộc thi, thí sinh, vòng thi
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        {
          contest: {
            name: {
              contains: keyword,
            },
          },
        },
        {
          student: {
            fullName: {
              contains: keyword,
            },
          },
        },
        {
          round: {
            name: {
              contains: keyword,
            },
          },
        },
      ]);
    }

    const students = await prisma.contestant.findMany({
      where: { contestId: idContest },
      select: { studentId: true },
    });

    const arrIds = students.map(item => item.studentId);

    const contestantsRaw = await prisma.contestant.findMany({
      where: {
        ...whereClause,
        contestId: { not: idContest },
        studentId: {
          notIn: arrIds,
        },
      },
      skip,
      distinct: ["studentId"],
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        student: {
          select: {
            id: true,
            fullName: true,
            studentCode: true,
            class: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        round: {
          select: {
            name: true,
          },
        },
        contest: {
          select: {
            name: true,
          },
        },
      },
    });

    const contestants = contestantsRaw.map(item => ({
      id: item.id,
      fullName: item.student.fullName,
      studentCode: item.student.studentCode,
      roundName: item.round.name,
      status: item.status,
      studentId: item.student.id,
      schoolId: item.student.class.school.id,
      schoolName: item.student.class.school.name,
      classId: item.student.class.id,
      className: item.student.class.name,
    }));

    // Đếm tổng số bản ghi
    const uniqueStudents = await prisma.contestant.groupBy({
      by: ["studentId"],
      where: {
        ...whereClause,
        contestId: { not: idContest },
        studentId: {
          notIn: arrIds,
        },
      },
    });

    const total = uniqueStudents.length;
    const totalPages = Math.ceil(total / limit);

    return {
      contestantes: contestants,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async getContestantByIdAndMatch(
    contestantId: number,
    matchId: number
  ): Promise<any> {
    return prisma.contestant.findFirst({
      where: {
        id: contestantId,
        contestantMatches: {
          some: {
            matchId: matchId,
          },
        },
      },
      select: {
        id: true,
        roundId: true,
        studentId: true,
        status: true,
        student: {
          select: {
            fullName: true,
            studentCode: true,
            class: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
        contestantMatches: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          where: {
            matchId: matchId,
          },
        },
      },
    });
  }

  static async getAllWithMatchGroups(
    query: ContestantQueryInput,
    contestId: number,
    matchId?: number
  ): Promise<{
    contestantes: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, roundId, status, schoolId, classId } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (contestId !== undefined) {
      whereClause.contestId = contestId;
    }

    if (roundId !== undefined) {
      whereClause.roundId = roundId;
    }

    if (status !== undefined) {
      whereClause.status = status;
    }

    // Filter by school ID
    if (schoolId !== undefined) {
      whereClause.student = {
        ...whereClause.student,
        class: {
          ...whereClause.student?.class,
          schoolId: schoolId,
        },
      };
    }

    // Filter by class ID
    if (classId !== undefined) {
      whereClause.student = {
        ...whereClause.student,
        classId: classId,
      };
    }

    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { contest: { is: { name: { contains: keyword } } } },
        { student: { is: { fullName: { contains: keyword } } } },
        { round: { is: { name: { contains: keyword } } } },
        {
          student: {
            is: {
              class: {
                is: { school: { is: { name: { contains: keyword } } } },
              },
            },
          },
        },
        { student: { is: { class: { is: { name: { contains: keyword } } } } } },
      ]);
    }

    const ContestantRaw = await prisma.contestant.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        student: {
          select: {
            fullName: true,
            studentCode: true,
            class: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
        contestantMatches: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          where: matchId
            ? {
              matchId: matchId,
            }
            : undefined,
        },
      },
    });

    const Contestantes = ContestantRaw.map(key => ({
      id: key.id,
      fullName: key.student.fullName,
      studentCode: key.student.studentCode,
      roundName: key.round.name,
      status: key.status,
      schoolId: key.student.class.school.id,
      schoolName: key.student.class.school.name,
      classId: key.student.class.id,
      className: key.student.class.name,
      group: key.contestantMatches[0]?.group || null,
    }));

    const total = await prisma.contestant.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      contestantes: Contestantes,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async getContestantDetailWithGroups(
    contestantId: number,
    contestSlug: string,
    matchId: number
  ): Promise<any> {
    return prisma.contestant.findFirst({
      where: {
        id: contestantId,
        contest: {
          slug: contestSlug,
        },
      },
      select: {
        id: true,
        roundId: true,
        studentId: true,
        status: true,
        student: {
          select: {
            fullName: true,
            studentCode: true,
            class: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
        contestantMatches: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          where: {
            matchId: matchId,
          },
        },
      },
    });
  }

  // Lấy danh sách thí sinh trong trận đấu theo slug cuộc thi và id trận đấu
  static async getContestantsInMatch(
    slug: string,
    matchId: number,
    query: {
      page: number;
      limit: number;
      search?: string;
      groupId?: number;
      schoolId?: number;
      classId?: number;
      roundId?: number;
      status?: string;
      schoolIds?: number[];
      classIds?: number[];
    }
  ): Promise<{
    contestants: Array<{
      id: number;
      fullName: string;
      studentCode: string | null;
      roundName: string;
      status: string;
      schoolId: number;
      schoolName: string;
      classId: number;
      className: string;
      groupId: number | null;
      groupName: string | null;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const {
      page,
      limit,
      search,
      groupId,
      schoolId,
      classId,
      roundId,
      status,
      schoolIds,
      classIds,
    } = query;
    const skip = (page - 1) * limit;

    // Tìm cuộc thi theo slug
    const contest = await prisma.contest.findFirst({
      where: { slug: slug },
    });

    if (!contest) {
      throw new Error("Không tìm thấy cuộc thi");
    }

    // Tìm trận đấu
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        contest: {
          slug: slug,
        },
      },
    });

    if (!match) {
      throw new Error("Không tìm thấy trận đấu trong cuộc thi này");
    }

    // Build where clause giống getAll
    const whereClause: any = {
      contestId: contest.id,
      contestantMatches: {
        some: {
          matchId: matchId,
        },
      },
    };

    // Filter by groupId
    if (groupId !== undefined) {
      if (groupId === -1) {
        // Chưa phân nhóm
        whereClause.contestantMatches = {
          none: { matchId: matchId },
        };
      } else if (groupId > 0) {
        whereClause.contestantMatches = {
          some: { matchId: matchId, groupId: groupId },
        };
      }
    }

    // // Filter by schoolId
    // if (schoolId !== undefined) {
    //   whereClause.student = {
    //     ...whereClause.student,
    //     class: {
    //       ...whereClause.student?.class,
    //       schoolId: schoolId
    //     }
    //   };
    // }

    // // Filter by classId
    // if (classId !== undefined) {
    //   whereClause.student = {
    //     ...whereClause.student,
    //     classId: classId
    //   };
    // }

    // Filter by roundId
    if (typeof roundId === "number" && !isNaN(roundId) && roundId > 0) {
      whereClause.roundId = roundId;
    }

    // Filter by status
    if (status !== undefined) {
      whereClause.status = status;
    }

    // // Filter by schoolIds/classIds (ưu tiên lọc đồng thời)
    // if (schoolIds && schoolIds.length > 0 && classIds && classIds.length > 0) {
    //   whereClause.student = {
    //     class: {
    //       schoolId: { in: schoolIds },
    //       id: { in: classIds }
    //     }
    //   };
    // } else if (schoolIds && schoolIds.length > 0) {
    //   whereClause.student = {
    //     class: {
    //       schoolId: { in: schoolIds }
    //     }
    //   };
    // } else if (classIds && classIds.length > 0) {
    //   whereClause.student = {
    //     class: {
    //       id: { in: classIds }
    //     }
    //   };
    // }
    const studentWhere: any = {};
    const classWhere: any = {};

    if (schoolId !== undefined) classWhere.schoolId = schoolId;
    if (classId !== undefined) classWhere.id = classId;
    if (schoolIds && schoolIds.length > 0)
      classWhere.schoolId = { in: schoolIds };
    if (classIds && classIds.length > 0) classWhere.id = { in: classIds };

    if (Object.keys(classWhere).length > 0) studentWhere.class = classWhere;
    if (Object.keys(studentWhere).length > 0)
      whereClause.student = studentWhere;

    // Filter by search
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { student: { is: { fullName: { contains: keyword } } } },
        { student: { is: { studentCode: { contains: keyword } } } },
        { round: { is: { name: { contains: keyword } } } },
        {
          student: {
            is: {
              class: {
                is: { school: { is: { name: { contains: keyword } } } },
              },
            },
          },
        },
        { student: { is: { class: { is: { name: { contains: keyword } } } } } },
      ]);
    }

    // Đếm tổng số thí sinh
    const total = await prisma.contestant.count({
      where: whereClause,
    });

    // Lấy danh sách thí sinh với thông tin nhóm trong trận đấu cụ thể
    const contestants = await prisma.contestant.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        student: {
          select: {
            fullName: true,
            studentCode: true,
            class: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        round: {
          select: {
            name: true,
          },
        },
        contestantMatches: {
          where: {
            matchId: matchId,
          },
          select: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ student: { fullName: "asc" } }],
    });

    // Transform dữ liệu để trả về đúng format
    const transformedContestants = contestants.map(contestant => {
      const group = contestant.contestantMatches?.[0]?.group || null;

      return {
        id: contestant.id,
        fullName: contestant.student.fullName,
        studentCode: contestant.student.studentCode,
        roundName: contestant.round.name,
        status: contestant.status,
        schoolId: contestant.student.class.school.id,
        schoolName: contestant.student.class.school.name,
        classId: contestant.student.class.id,
        className: contestant.student.class.name,
        groupId: group?.id || null,
        groupName: group?.name || null,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      contestants: transformedContestants,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**====================================CỨU trợ====================================== */
  // Hàm dùng chung: lấy danh sách contestantMatch bị loại trong 1 trận đấu
  static async getEliminatedContestants(
    matchId: number,
    statuses: string[] = ["eliminated"]
  ) {
    return prisma.contestantMatch.findMany({
      where: {
        matchId,
        status: { in: statuses as any },
      },
      select: {
        contestantId: true,
        eliminatedAtQuestionOrder: true,
        registrationNumber: true,
        contestant: {
          select: {
            id: true,
            status: true,
            student: {
              select: {
                fullName: true,
                studentCode: true,
                class: {
                  select: {
                    id: true,
                    name: true,
                    school: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            round: { select: { name: true } },
          },
        },
      },
    });
  }

  // Lấy danh sách thí sinh bị loại để cứu trợ, sắp xếp theo số câu đúng và thứ tự bị loại, trả về rescue nếu rescueId có
  static async getRescueCandidates(
    matchId: number,
    rescueId?: number,
    limit?: number
  ) {
    // Tái sử dụng hàm lấy danh sách bị loại
    const eliminatedContestants = await this.getEliminatedContestants(matchId);

    // Lấy số câu đúng của từng thí sinh trong trận đấu này
    const contestantIds = eliminatedContestants.map(e => e.contestantId);
    const results = await prisma.result.groupBy({
      by: ["contestantId"],
      where: {
        matchId,
        contestantId: { in: contestantIds },
        isCorrect: true,
      },
      _count: { id: true },
    });

    // Map contestantId -> correctAnswers
    const correctAnswersMap = new Map<number, number>();
    results.forEach(r => {
      correctAnswersMap.set(r.contestantId, r._count.id);
    });

    // Kết hợp dữ liệu và sắp xếp
    const candidates = eliminatedContestants.map(e => ({
      contestantId: e.contestantId,
      fullName: e.contestant.student.fullName,
      studentCode: e.contestant.student.studentCode,
      schoolId: e.contestant.student.class.school.id,
      schoolName: e.contestant.student.class.school.name,
      classId: e.contestant.student.class.id,
      className: e.contestant.student.class.name,
      roundName: e.contestant.round?.name || "",
      status: e.contestant.status,
      correctAnswers: correctAnswersMap.get(e.contestantId) || 0,
      eliminatedAtQuestionOrder: e.eliminatedAtQuestionOrder,
      registrationNumber: e.registrationNumber,
    }));

    candidates.sort((a, b) => {
      if (b.correctAnswers !== a.correctAnswers) {
        return b.correctAnswers - a.correctAnswers;
      }
      return (
        (b.eliminatedAtQuestionOrder || 0) - (a.eliminatedAtQuestionOrder || 0)
      );
    });

    // Áp dụng limit nếu có, đảm bảo không vượt quá số thí sinh có sẵn
    let limitedCandidates = candidates;
    const maxAvailable = candidates.length;
    let actualLimit = maxAvailable;

    if (limit !== undefined && limit > 0) {
      actualLimit = Math.min(limit, maxAvailable);
      limitedCandidates = candidates.slice(0, actualLimit);
    }

    let rescue = undefined;
    if (rescueId) {
      // Dọn studentIds cũ và cập nhật hoàn toàn bằng danh sách candidates đã giới hạn
      const studentIds = limitedCandidates.map(d => d.contestantId);
      rescue = await prisma.rescue.update({
        where: { id: rescueId },
        data: { studentIds }, // Thay thế hoàn toàn studentIds cũ
      });
    }

    return {
      rescue,
      candidates: limitedCandidates,
      meta: {
        requestedLimit: limit,
        actualLimit,
        maxAvailable,
        totalCandidates: candidates.length,
      },
    };
  }

  // Cập nhật cứu trợ hàng loạt cho các thí sinh trong trận đấu
  static async rescueMany(
    matchId: number,
    contestantIds: number[],
    currentQuestionOrder: number,
    rescueId?: number
  ) {
    // Cập nhật status và rescuedAtQuestionOrder cho các contestantMatch
    const result = await prisma.contestantMatch.updateMany({
      where: {
        matchId,
        contestantId: { in: contestantIds },
      },
      data: {
        status: "rescued",
        rescuedAtQuestionOrder: currentQuestionOrder,
      },
    });

    // Khi bị loại, trạng thái ở cấp cuộc thi đã bị đổi thành "eliminate";
    // được cứu trợ thì phải trả về "compete" để còn được chia nhóm ở trận sau.
    await prisma.contestant.updateMany({
      where: { id: { in: contestantIds } },
      data: { status: "compete" },
    });

    // Nếu có rescueId, cập nhật status của rescue thành "used"
    let rescueUpdated = false;
    if (rescueId) {
      try {
        await prisma.rescue.update({
          where: { id: rescueId },
          data: { status: "used" },
        });
        rescueUpdated = true;
      } catch (error) {
        console.warn(
          `Không thể cập nhật rescue status cho rescueId ${rescueId}:`,
          error
        );
      }
    }

    return {
      ...result,
      rescueUpdated,
    };
  }

  // Lấy danh sách thí sinh bị loại có phân trang, lọc, tìm kiếm
  static async getEliminatedContestantsWithFilter(
    query: any,
    matchId: number,
    statuses: string[] = ["eliminated"]
  ) {
    const {
      page = 1,
      limit = 10,
      search,
      schoolId,
      classId,
      status,
      registrationNumber,
    } = query;

    // Convert query parameters to numbers once
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const schoolIdNum = schoolId ? Number(schoolId) : undefined;
    const classIdNum = classId ? Number(classId) : undefined;

    const skip = (pageNum - 1) * limitNum;

    // where cho contestantMatch
    const whereMatch: any = {
      matchId,
      status: { in: statuses },
    };
    // where cho contestant
    const whereContestant: any = {};
    if (schoolIdNum) whereContestant["student.class.schoolId"] = schoolIdNum;
    if (classIdNum) whereContestant["student.classId"] = classIdNum;
    if (status) whereContestant["status"] = status;
    // Tìm kiếm theo tên, mã, lớp, trường
    let searchFilter = [];
    if (search) {
      const keywords = search.trim().split(/\s+/);
      searchFilter = keywords.flatMap((keyword: string) => [
        { contestant: { student: { fullName: { contains: keyword } } } },
        { contestant: { student: { studentCode: { contains: keyword } } } },
        { contestant: { student: { class: { name: { contains: keyword } } } } },
        {
          contestant: {
            student: { class: { school: { name: { contains: keyword } } } },
          },
        },
        // For registrationNumber, try to convert keyword to number and use equality
        ...(Number.isInteger(Number(keyword)) && !isNaN(Number(keyword))
          ? [{ registrationNumber: Number(keyword) }]
          : []),
      ]);
    }

    // Tìm kiếm riêng theo registrationNumber
    if (registrationNumber) {
      const regNumberInt = Number(registrationNumber);
      if (!isNaN(regNumberInt) && Number.isInteger(regNumberInt)) {
        const registrationFilter = { registrationNumber: regNumberInt };
        if (searchFilter.length > 0) {
          searchFilter.push(registrationFilter);
        } else {
          searchFilter = [registrationFilter];
        }
      }
    }
    // Lấy tổng số
    const total = await prisma.contestantMatch.count({
      where: {
        ...whereMatch,
        ...whereContestant,
        ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
      },
    });
    // Lấy danh sách
    const data = await prisma.contestantMatch.findMany({
      where: {
        ...whereMatch,
        ...whereContestant,
        ...(searchFilter.length > 0 ? { OR: searchFilter } : {}),
      },
      skip,
      take: limitNum,
      orderBy: [
        { eliminatedAtQuestionOrder: "desc" },
        { contestantId: "desc" },
      ],
      select: {
        contestantId: true,
        eliminatedAtQuestionOrder: true,
        registrationNumber: true,
        contestant: {
          select: {
            id: true,
            status: true,
            student: {
              select: {
                fullName: true,
                studentCode: true,
                class: {
                  select: {
                    id: true,
                    name: true,
                    school: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            round: { select: { name: true } },
          },
        },
      },
    });
    const totalPages = Math.ceil(total / limitNum);
    return {
      contestants: data.map(e => {
        const c = e.contestant;
        return {
          contestantId: e.contestantId,
          fullName: c.student.fullName,
          studentCode: c.student.studentCode,
          roundName: c.round.name,
          status: c.status,
          schoolId: c.student.class.school.id,
          schoolName: c.student.class.school.name,
          classId: c.student.class.id,
          className: c.student.class.name,
          eliminatedAtQuestionOrder: e.eliminatedAtQuestionOrder,
          registrationNumber: e.registrationNumber,
        };
      }),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    };
  }

  // API: Lấy danh sách thí sinh đã được cứu trợ theo rescueId, trả về rescue + contestants (tương tự getRescueCandidates)
  static async getRescuedContestantsByRescueId(rescueId: number) {
    // Lấy rescue
    const rescue = await prisma.rescue.findUnique({ where: { id: rescueId } });
    if (!rescue) throw new Error("Rescue không tồn tại");
    let studentIds: number[] = [];
    if (Array.isArray(rescue.studentIds)) {
      studentIds = rescue.studentIds.map(Number).filter(x => !isNaN(x));
    } else if (typeof rescue.studentIds === "string") {
      try {
        const arr = JSON.parse(rescue.studentIds);
        if (Array.isArray(arr))
          studentIds = arr.map(Number).filter(x => !isNaN(x));
      } catch { }
    } else if (rescue.studentIds && typeof rescue.studentIds === "object") {
      // Nếu là object kiểu JsonArray
      studentIds = Object.values(rescue.studentIds)
        .map(Number)
        .filter(x => !isNaN(x));
    }
    if (!studentIds || studentIds.length === 0) {
      return { rescue, contestants: [] };
    }
    // Lấy contestantMatch theo matchId và contestantId (studentId)
    const contestantMatches = await prisma.contestantMatch.findMany({
      where: {
        matchId: rescue.matchId,
        contestantId: { in: studentIds },
      },
      select: {
        contestantId: true,
        eliminatedAtQuestionOrder: true,
        registrationNumber: true,
        contestant: {
          select: {
            id: true,
            status: true,
            student: {
              select: {
                fullName: true,
                studentCode: true,
                class: {
                  select: {
                    id: true,
                    name: true,
                    school: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            round: { select: { name: true } },
          },
        },
      },
    });
    // Lấy số câu đúng của từng thí sinh trong trận đấu này
    const results = await prisma.result.groupBy({
      by: ["contestantId"],
      where: {
        matchId: rescue.matchId,
        contestantId: { in: studentIds },
        isCorrect: true,
      },
      _count: { id: true },
    });
    const correctAnswersMap = new Map<number, number>();
    results.forEach(r => correctAnswersMap.set(r.contestantId, r._count.id));
    // Kết hợp dữ liệu
    const contestants = contestantMatches.map(e => ({
      contestantId: e.contestantId,
      fullName: e.contestant.student.fullName,
      studentCode: e.contestant.student.studentCode,
      schoolId: e.contestant.student.class.school.id,
      schoolName: e.contestant.student.class.school.name,
      classId: e.contestant.student.class.id,
      className: e.contestant.student.class.name,
      roundName: e.contestant.round?.name || "",
      status: e.contestant.status,
      correctAnswers: correctAnswersMap.get(e.contestantId) || 0,
      eliminatedAtQuestionOrder: e.eliminatedAtQuestionOrder,
      registrationNumber: e.registrationNumber,
    }));
    return { rescue, contestants };
  }

  // API: Thêm hàng loạt studentIds vào rescue (push, không trùng lặp)
  static async addStudentsToRescue(rescueId: number, studentIds: number[]) {
    // Lấy rescue hiện tại
    const rescue = await prisma.rescue.findUnique({ where: { id: rescueId } });
    if (!rescue) throw new Error("Rescue không tồn tại");

    // Parse studentIds hiện tại từ JSON
    let currentStudentIds: number[] = [];
    if (Array.isArray(rescue.studentIds)) {
      currentStudentIds = rescue.studentIds.map(Number).filter(x => !isNaN(x));
    } else if (typeof rescue.studentIds === "string") {
      try {
        const arr = JSON.parse(rescue.studentIds);
        if (Array.isArray(arr))
          currentStudentIds = arr.map(Number).filter(x => !isNaN(x));
      } catch { }
    } else if (rescue.studentIds && typeof rescue.studentIds === "object") {
      currentStudentIds = Object.values(rescue.studentIds)
        .map(Number)
        .filter(x => !isNaN(x));
    }

    // Thêm studentIds mới, không trùng lặp
    const uniqueNewIds = studentIds.filter(
      id => !currentStudentIds.includes(id)
    );
    const updatedStudentIds = [...currentStudentIds, ...uniqueNewIds];

    // Cập nhật rescue
    const updatedRescue = await prisma.rescue.update({
      where: { id: rescueId },
      data: {
        studentIds: updatedStudentIds,
      },
    });

    return {
      rescue: updatedRescue,
      addedCount: uniqueNewIds.length,
      totalCount: updatedStudentIds.length,
    };
  }

  // API: Xóa 1 studentId khỏi rescue
  static async removeStudentFromRescue(rescueId: number, studentId: number) {
    // Lấy rescue hiện tại
    const rescue = await prisma.rescue.findUnique({ where: { id: rescueId } });
    if (!rescue) throw new Error("Rescue không tồn tại");

    // Parse studentIds hiện tại từ JSON
    let currentStudentIds: number[] = [];
    if (Array.isArray(rescue.studentIds)) {
      currentStudentIds = rescue.studentIds.map(Number).filter(x => !isNaN(x));
    } else if (typeof rescue.studentIds === "string") {
      try {
        const arr = JSON.parse(rescue.studentIds);
        if (Array.isArray(arr))
          currentStudentIds = arr.map(Number).filter(x => !isNaN(x));
      } catch { }
    } else if (rescue.studentIds && typeof rescue.studentIds === "object") {
      currentStudentIds = Object.values(rescue.studentIds)
        .map(Number)
        .filter(x => !isNaN(x));
    }

    // Kiểm tra xem studentId có tồn tại không
    if (!currentStudentIds.includes(studentId)) {
      throw new Error("Student ID không tồn tại trong rescue này");
    }

    // Xóa studentId khỏi danh sách
    const updatedStudentIds = currentStudentIds.filter(id => id !== studentId);

    // Cập nhật rescue
    const updatedRescue = await prisma.rescue.update({
      where: { id: rescueId },
      data: {
        studentIds: updatedStudentIds,
      },
    });

    return {
      rescue: updatedRescue,
      removedStudentId: studentId,
      totalCount: updatedStudentIds.length,
    };
  }

  static async listContestant(id: number): Promise<any> {
    const contestantRaw = await prisma.contestant.findMany({
      where: { contestId: id },
      select: {
        id: true,
        student: {
          select: {
            fullName: true,
          },
        },
      },
    });
    const contestant = contestantRaw.map(item => ({
      id: item.id,
      fullName: item.student.fullName,
    }));

    return contestant;
  }
  //** BỔ SUNG SERVICE CỨU TRỢ */
  // lấy số thí sinh còn lại trong trận đấu (tức trạng thái in-progress hoặc rescued)
  static async getRemainingContestantsCount(matchId: number): Promise<number> {
    try {
      const count = await prisma.contestantMatch.count({
        where: {
          matchId,
          status: {
            in: ['in_progress', 'rescued']
          }
        }
      });

      return count;
    } catch (error) {
      console.error('Error getting remaining contestants count:', error);
      throw new Error(`Lỗi khi lấy số thí sinh còn lại: ${(error as Error).message}`);
    }
  }

  /**====================================== thí sinh qua vòng ==============================*/
  // Lấy thông tin đầy đủ về thí sinh vàng (gold contestant) trong trận đấu
  static async getGoldContestantInMatch(matchId: number) {
    try {
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: { studentId: true },
      });

      const goldStudentId = match?.studentId;
      if (!goldStudentId) {
        return null;
      }

      // Tìm thí sinh vàng trong trận đấu này
      const goldContestant = await prisma.contestantMatch.findFirst({
        where: {
          matchId,
          contestant: {
            studentId: goldStudentId,
          },
        },
        select: {
          contestantId: true,
          eliminatedAtQuestionOrder: true,
          registrationNumber: true,
          status: true,
          contestant: {
            select: {
              id: true,
              status: true,
              student: {
                select: {
                  fullName: true,
                  studentCode: true,
                  class: {
                    select: {
                      id: true,
                      name: true,
                      school: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
              round: { select: { name: true } },
            },
          },
        },
      });

      return goldContestant;
    } catch (error) {
      console.error('Error getting gold contestant in match:', error);
      return null;
    }
  }
  // Lấy danh sách thí sinh ứng cử viên và tự động cập nhật trạng thái thành "completed"
  static async getCandidatesList(
    matchId: number,
    limit?: number
  ) {
    // Ứng viên qua vòng là thí sinh còn trong trận; thí sinh bị loại hoặc bị
    // cấm không được qua vòng.
    const eliminatedContestants = await this.getEliminatedContestants(matchId, [
      "in_progress",
      "rescued",
      "confirmed1",
      "confirmed2",
    ]);

    // Lấy thông tin về gold contestant (thí sinh vàng)
    const goldContestant = await this.getGoldContestantInMatch(matchId);

    // Lấy số câu đúng của từng thí sinh trong trận đấu này
    const contestantIds = eliminatedContestants.map(e => e.contestantId);

    // Nếu có gold contestant và chưa có trong danh sách eliminated, thêm vào danh sách để tính toán
    const allContestantIds = [...contestantIds];
    if (goldContestant && !contestantIds.includes(goldContestant.contestantId)) {
      allContestantIds.push(goldContestant.contestantId);
    }

    const results = await prisma.result.groupBy({
      by: ["contestantId"],
      where: {
        matchId,
        contestantId: { in: allContestantIds },
        isCorrect: true,
      },
      _count: { id: true },
    });

    // Map contestantId -> correctAnswers
    const correctAnswersMap = new Map<number, number>();
    results.forEach(r => {
      correctAnswersMap.set(r.contestantId, r._count.id);
    });

    // Kết hợp dữ liệu và sắp xếp
    const candidates = eliminatedContestants.map(e => ({
      contestantId: e.contestantId,
      fullName: e.contestant.student.fullName,
      studentCode: e.contestant.student.studentCode,
      schoolId: e.contestant.student.class.school.id,
      schoolName: e.contestant.student.class.school.name,
      classId: e.contestant.student.class.id,
      className: e.contestant.student.class.name,
      roundName: e.contestant.round?.name || "",
      status: e.contestant.status,
      correctAnswers: correctAnswersMap.get(e.contestantId) || 0,
      eliminatedAtQuestionOrder: e.eliminatedAtQuestionOrder,
      registrationNumber: e.registrationNumber,
    }));

    // Nếu có gold contestant và chưa có trong danh sách candidates, thêm vào
    if (
      goldContestant &&
      !["eliminated", "banned"].includes(goldContestant.status) &&
      !candidates.find(c => c.contestantId === goldContestant.contestantId)
    ) {
      candidates.push({
        contestantId: goldContestant.contestantId,
        fullName: goldContestant.contestant.student.fullName,
        studentCode: goldContestant.contestant.student.studentCode,
        schoolId: goldContestant.contestant.student.class.school.id,
        schoolName: goldContestant.contestant.student.class.school.name,
        classId: goldContestant.contestant.student.class.id,
        className: goldContestant.contestant.student.class.name,
        roundName: goldContestant.contestant.round?.name || "",
        status: goldContestant.contestant.status,
        correctAnswers: correctAnswersMap.get(goldContestant.contestantId) || 0,
        eliminatedAtQuestionOrder: goldContestant.eliminatedAtQuestionOrder,
        registrationNumber: goldContestant.registrationNumber,
      });
    }

    // candidates.sort((a, b) => {
    //   if (b.correctAnswers !== a.correctAnswers) {
    //     return b.correctAnswers - a.correctAnswers;
    //   }
    //   return (
    //     (b.eliminatedAtQuestionOrder || 0) - (a.eliminatedAtQuestionOrder || 0)
    //   );
    // });
    candidates.sort((a, b) => {
      // Ưu tiên gold contestant lên đầu
      const aIsGold = goldContestant && a.contestantId === goldContestant.contestantId;
      const bIsGold = goldContestant && b.contestantId === goldContestant.contestantId;

      if (aIsGold && !bIsGold) return -1; // a (gold) lên trước
      if (!aIsGold && bIsGold) return 1;  // b (gold) lên trước

      // Nếu cả hai đều không phải gold hoặc cả hai đều là gold, sắp xếp theo logic cũ
      if (b.correctAnswers !== a.correctAnswers) {
        return b.correctAnswers - a.correctAnswers;
      }
      return (
        (b.eliminatedAtQuestionOrder || 0) - (a.eliminatedAtQuestionOrder || 0)
      );
    });

    // Xử lý limit với logic đặc biệt cho gold contestant
    let limitedCandidates = candidates;
    const maxAvailable = candidates.length;
    let actualLimit = maxAvailable;
    let goldIncluded = false;

    if (limit !== undefined && limit > 0) {
      actualLimit = Math.min(limit, maxAvailable);

      // Nếu có gold contestant, đảm bảo nó luôn được bao gồm
      if (goldContestant) {
        const goldCandidateIndex = candidates.findIndex(c => c.contestantId === goldContestant.contestantId);

        if (goldCandidateIndex !== -1) {
          if (goldCandidateIndex < actualLimit) {
            // Gold contestant đã nằm trong top limit, lấy top limit bình thường
            limitedCandidates = candidates.slice(0, actualLimit);
            goldIncluded = true;
          } else {
            // Gold contestant không nằm trong top limit, lấy top (limit-1) + gold contestant
            const topCandidates = candidates.slice(0, actualLimit - 1);
            const goldCandidate = candidates[goldCandidateIndex];
            limitedCandidates = [...topCandidates, goldCandidate];
            goldIncluded = true;
          }
        } else {
          // Gold contestant không tồn tại trong danh sách (trường hợp bất thường)
          limitedCandidates = candidates.slice(0, actualLimit);
        }
      } else {
        // Không có gold contestant, lấy top limit bình thường
        limitedCandidates = candidates.slice(0, actualLimit);
      }
    } else {
      // Không có limit, lấy tất cả
      goldIncluded = goldContestant ? candidates.some(c => c.contestantId === goldContestant.contestantId) : false;
    }

    // Tự động cập nhật trạng thái thành "completed" cho các thí sinh được chọn
    // let updateResult = null;
    // if (limitedCandidates.length > 0) {
    //   const candidateIds = limitedCandidates.map(c => c.contestantId);
    //   try {
    //     updateResult = await this.updateToCompleted(matchId, candidateIds);
    //   } catch (error) {
    //     console.error('Lỗi khi cập nhật trạng thái completed:', error);
    //     // Không throw error để không làm gián đoạn việc trả về danh sách
    //   }
    // }

    return {
      candidates: limitedCandidates,
      // updateResult,
      meta: {
        requestedLimit: limit,
        actualLimit,
        maxAvailable,
        totalCandidates: candidates.length,
        goldIncluded,
        goldContestantId: goldContestant?.contestantId || null,
        // autoUpdated: updateResult?.success || false,
        // updatedCount: updateResult?.updatedCount || 0,
      },
    };
  }

  // API lấy danh sách thí sinh đã hoàn thành trong trận đấu với format tương tự như getCandidatesList
  static async getCompletedContestants(
    matchId: number,
    limit?: number
  ) {
    // Lấy danh sách thí sinh đã hoàn thành trong trận đấu
    const completedContestants = await prisma.contestantMatch.findMany({
      where: {
        matchId,
        status: "completed",
      },
      select: {
        contestantId: true,
        registrationNumber: true,
        eliminatedAtQuestionOrder: true,
        contestant: {
          select: {
            id: true,
            status: true,
            student: {
              select: {
                fullName: true,
                studentCode: true,
                class: {
                  select: {
                    id: true,
                    name: true,
                    school: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            round: { select: { name: true } },
          },
        },
      },
      take: limit || undefined, // Nếu limit không được cung cấp, lấy tất cả
    });

    // Lấy số câu đúng của từng thí sinh trong trận đấu này
    const contestantIds = completedContestants.map(c => c.contestantId);
    const results = await prisma.result.groupBy({
      by: ["contestantId"],
      where: {
        matchId,
        contestantId: { in: contestantIds },
        isCorrect: true,
      },
      _count: { id: true },
    });

    // Map contestantId -> correctAnswers
    const correctAnswersMap = new Map<number, number>();
    results.forEach(r => {
      correctAnswersMap.set(r.contestantId, r._count.id);
    });

    // Kết hợp dữ liệu và sắp xếp theo số câu đúng (giảm dần)
    const candidates = completedContestants.map(item => ({
      contestantId: item.contestantId,
      registrationNumber: item.registrationNumber,
      eliminatedAtQuestionOrder: item.eliminatedAtQuestionOrder,
      fullName: item.contestant.student.fullName,
      studentCode: item.contestant.student.studentCode,
      schoolId: item.contestant.student.class.school.id,
      schoolName: item.contestant.student.class.school.name,
      classId: item.contestant.student.class.id,
      className: item.contestant.student.class.name,
      roundName: item.contestant.round?.name || "",
      status: item.contestant.status,
      correctAnswers: correctAnswersMap.get(item.contestantId) || 0,
    }));

    // Sắp xếp theo số câu đúng (giảm dần)
    candidates.sort((a, b) => {
      if (b.correctAnswers !== a.correctAnswers) {
        return b.correctAnswers - a.correctAnswers;
      }
      return (
        (b.eliminatedAtQuestionOrder || 0) - (a.eliminatedAtQuestionOrder || 0)
      );
    });

    return {
      candidates,
      meta: {
        requestedLimit: limit,
        actualLimit: candidates.length,
        maxAvailable: candidates.length,
        totalCandidates: candidates.length,
      },
    };
  }


  // Cập nhật trạng thái thành completed cho các thí sinh trong trận đấu
  static async updateToCompleted(
    matchId: number,
    contestantIds: number[]
  ) {
    try {
      // Kiểm tra xem matchId có tồn tại không
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: { id: true }
      });

      if (!match) {
        throw new Error(`Không tìm thấy trận đấu với ID: ${matchId}`);
      }

      // Kiểm tra xem các contestantMatch có tồn tại không
      const existingContestantMatches = await prisma.contestantMatch.findMany({
        where: {
          matchId,
          contestantId: { in: contestantIds },
        },
        select: { contestantId: true }
      });

      const existingIds = existingContestantMatches.map(cm => cm.contestantId);
      const notFoundIds = contestantIds.filter(id => !existingIds.includes(id));

      if (notFoundIds.length > 0) {
        console.warn(`Không tìm thấy ContestantMatch cho các contestant IDs: ${notFoundIds.join(', ')} trong match ${matchId}`);
      }

      // Cập nhật status thành "completed" cho các contestantMatch tồn tại
      const result = await prisma.contestantMatch.updateMany({
        where: {
          matchId,
          contestantId: { in: existingIds },
        },
        data: {
          status: "completed",
        },
      });

      return {
        success: true,
        updatedCount: result.count,
        requestedIds: contestantIds,
        updatedIds: existingIds,
        notFoundIds,
        message: `Đã cập nhật ${result.count} thí sinh thành trạng thái completed`
      };

    } catch (error) {
      console.error('Error updating contestant matches to completed:', error);
      throw error;
    }
  }

  // Cập nhật trạng thái thành eliminated cho các thí sinh trong trận đấu (từ completed về eliminated)
  static async updateToEliminated(
    matchId: number,
    contestantIds: number[]
  ) {
    try {
      // Kiểm tra xem matchId có tồn tại không
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: { id: true }
      });

      if (!match) {
        throw new Error(`Không tìm thấy trận đấu với ID: ${matchId}`);
      }

      // Kiểm tra xem các contestantMatch có tồn tại và đang ở trạng thái completed không
      const existingContestantMatches = await prisma.contestantMatch.findMany({
        where: {
          matchId,
          contestantId: { in: contestantIds },
          status: "completed" // Chỉ cho phép cập nhật những thí sinh đang ở trạng thái completed
        },
        select: { contestantId: true }
      });

      const existingIds = existingContestantMatches.map(cm => cm.contestantId);
      const notFoundIds = contestantIds.filter(id => !existingIds.includes(id));

      if (notFoundIds.length > 0) {
        console.warn(`Không tìm thấy ContestantMatch với trạng thái completed cho các contestant IDs: ${notFoundIds.join(', ')} trong match ${matchId}`);
      }

      // Cập nhật status thành "eliminated" cho các contestantMatch tồn tại và đang completed
      const result = await prisma.contestantMatch.updateMany({
        where: {
          matchId,
          contestantId: { in: existingIds },
          status: "completed"
        },
        data: {
          status: "eliminated",
        },
      });

      return {
        success: true,
        updatedCount: result.count,
        requestedIds: contestantIds,
        updatedIds: existingIds,
        notFoundIds,
        message: `Đã cập nhật ${result.count} thí sinh từ completed về eliminated`
      };

    } catch (error) {
      console.error('Error updating contestant matches to eliminated:', error);
      throw error;
    }
  }

  // API: Tìm tất cả thí sinh có trạng thái completed trong trận đấu và cập nhật về eliminated
  static async updateAllCompletedToEliminated(matchId: number) {
    try {
      // Kiểm tra xem matchId có tồn tại không
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: { id: true }
      });

      if (!match) {
        throw new Error(`Không tìm thấy trận đấu với ID: ${matchId}`);
      }

      // Tìm tất cả các contestantMatch có trạng thái completed trong trận đấu
      const completedContestantMatches = await prisma.contestantMatch.findMany({
        where: {
          matchId,
          status: "completed"
        },
        select: {
          contestantId: true,
          contestant: {
            select: {
              student: {
                select: {
                  fullName: true
                }
              }
            }
          }
        }
      });

      if (completedContestantMatches.length === 0) {
        return {
          success: true,
          updatedCount: 0,
          completedIds: [],
          message: "Không tìm thấy thí sinh nào có trạng thái completed để cập nhật"
        };
      }

      const completedIds = completedContestantMatches.map(cm => cm.contestantId);

      // Cập nhật tất cả từ completed về eliminated
      const result = await prisma.contestantMatch.updateMany({
        where: {
          matchId,
          status: "completed"
        },
        // Thí sinh qua vòng vốn đang thi, nên hủy qua vòng là trả về "đang thi".
        data: {
          status: "in_progress",
        },
      });

      return {
        success: true,
        updatedCount: result.count,
        completedIds,
        contestantNames: completedContestantMatches.map(cm => cm.contestant.student.fullName),
        message: `Đã cập nhật ${result.count} thí sinh từ completed về eliminated`
      };

    } catch (error) {
      console.error('Error updating all completed contestants to eliminated:', error);
      throw error;
    }
  }
}

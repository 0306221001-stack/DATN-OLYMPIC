import { prisma } from "@/config/database";
import {
  MatchById,
  CreateMatchInput,
  UpdateMatchInput,
  MatchQuerySchema,
  MatchType,
  MatchQueryInput,
} from "@/modules/match";
import { Match, Prisma, Student } from "@prisma/client";
import slugify from "slugify";

export default class MatchService {
  static async getAll(
    query: MatchQueryInput,
    contestId: number
  ): Promise<{
    matches: MatchType[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, isActive, status } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }
    if (contestId !== undefined) {
      whereClause.contestId = contestId;
    }

    if (status !== undefined) {
      whereClause.status = status;
    }
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { name: { contains: keyword } },
        { contest: { is: { name: { contains: keyword } } } },
      ]);
    }

    const matchRaw = await prisma.match.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        remainingTime: true,
        name: true,
        contestId: true,
        isActive: true,
        startTime: true,
        endTime: true,
        status: true,
        currentQuestion: true,
        questionPackageId: true,
        studentId: true,
        student: { select: { fullName: true } },
        questionPackage: { select: { name: true } },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
      },
    });
    const matches = matchRaw.map(key => ({
      id: key.id,
      contestId: key.contestId,
      name: key.name,
      startTime: key.startTime,
      endTime: key.endTime,
      currentQuestion: key.currentQuestion,
      questionPackageId: key.questionPackageId,
      questionPackageName: key.questionPackage.name,
      studentFullName: key.student?.fullName ?? "",
      contestName: key.contest?.name ?? "",
      isActive: key.isActive,
      status: key.status ?? "",
      slug: key.slug ?? "",
      remainingTime: key.remainingTime ?? 0,
      studentId: key.studentId ?? undefined,
      roundName: key.round.name ?? "",
    }));

    const total = await prisma.match.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      matches: matches,
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

  static async getMatchBy(data: any): Promise<MatchById | null> {
    return prisma.match.findFirst({
      where: {
        ...data,
      },
      select: {
        id: true,
        slug: true,
        remainingTime: true,
        name: true,
        contestId: true,
        isActive: true,
        startTime: true,
        endTime: true,
        roundId: true,
        status: true,
        currentQuestion: true,
        questionPackageId: true,
        maxContestantColumn: true,
        studentId: true,
        student: { select: { fullName: true } },
        questionPackage: { select: { name: true } },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static async create(data: CreateMatchInput): Promise<Match | null> {
    return prisma.match.create({
      data: {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      },
    });
  }

  static async update(
    id: number,
    data: UpdateMatchInput
  ): Promise<Match | null> {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
      const slug = await MatchService.generateUniqueSlug(data.name);
      updateData.slug = slug;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    if (data.contestId !== undefined) {
      updateData.contestId = data.contestId;
    }

    if (data.endTime !== undefined) {
      updateData.endTime = new Date(data.endTime);
    }

    if (data.startTime !== undefined) {
      updateData.startTime = new Date(data.startTime);
    }

    if (data.remainingTime !== undefined) {
      updateData.remainingTime = data.remainingTime;
    }

    if (data.roundId !== undefined) {
      updateData.roundId = data.roundId;
    }

    if (data.studentId !== undefined) {
      updateData.studentId = data.studentId;
    }

    if (data.currentQuestion !== undefined) {
      updateData.currentQuestion = data.currentQuestion;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.questionPackageId !== undefined) {
      updateData.questionPackageId = data.questionPackageId;
    }

    if (data.slug !== undefined) {
      updateData.slug = data.slug;
    }

    if (data.maxContestantColumn !== undefined) {
      updateData.maxContestantColumn = data.maxContestantColumn;
    }

    // console.log(data);
    return prisma.match.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }
  static async deleteMatch(id: number): Promise<Match> {
    return prisma.$transaction(async tx => {
      const match = await tx.match.findUniqueOrThrow({ where: { id } });
      await MatchService.deleteMatchesWithData(tx, [id]);
      return match;
    });
  }

  /**
   * Xóa các trận cùng toàn bộ dữ liệu của trận: màn hình chiếu, kết quả, thí
   * sinh trong trận, nhóm, cứu trợ, giải thưởng. Mọi khóa ngoại tới trận đều
   * là Restrict nên phải xóa bảng con trước. Chạy trong transaction của nơi gọi.
   */
  static async deleteMatchesWithData(
    tx: Prisma.TransactionClient,
    matchIds: number[]
  ): Promise<number> {
    if (matchIds.length === 0) return 0;
    const byMatch = { matchId: { in: matchIds } };

    // Bị loại/cấm trong trận thì trạng thái cấp cuộc thi đã thành "eliminate".
    // Xóa trận thì trả về "compete", trừ khi còn bị loại ở một trận khác.
    const knockedOut = await tx.contestantMatch.findMany({
      where: { ...byMatch, status: { in: ["eliminated", "banned"] } },
      select: { contestantId: true },
    });

    await tx.screenControl.deleteMany({ where: byMatch });
    await tx.result.deleteMany({ where: byMatch });
    await tx.contestantMatch.deleteMany({ where: byMatch });
    await tx.group.deleteMany({ where: byMatch });
    await tx.rescue.deleteMany({ where: byMatch });
    await tx.award.deleteMany({ where: byMatch });
    const { count } = await tx.match.deleteMany({
      where: { id: { in: matchIds } },
    });

    const contestantIds = [...new Set(knockedOut.map(k => k.contestantId))];
    if (contestantIds.length > 0) {
      const stillOut = await tx.contestantMatch.findMany({
        where: {
          contestantId: { in: contestantIds },
          status: { in: ["eliminated", "banned"] },
        },
        select: { contestantId: true },
      });
      const stillOutIds = new Set(stillOut.map(s => s.contestantId));
      await tx.contestant.updateMany({
        where: {
          id: { in: contestantIds.filter(cid => !stillOutIds.has(cid)) },
          status: "eliminate",
        },
        data: { status: "compete" },
      });
    }

    return count;
  }

  static async getListMatch(slug: string) {
    return prisma.match.findMany({
      where: {
        isActive: true,
        contest: {
          slug: slug,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }

  static async generateUniqueSlug(
    name: string,
    excludeId?: number
  ): Promise<string> {
    const baseSlug = slugify(name, { lower: true, locale: "vi", strict: true });
    let slug = baseSlug;
    let suffix = 1;

    while (true) {
      const exists = await prisma.match.findFirst({
        where: {
          slug,
          ...(excludeId && { NOT: { id: excludeId } }),
        },
      });

      if (!exists) break;
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    return slug;
  }

  static async MatchControl(slug: string) {
    const matchRaw = await prisma.match.findFirst({
      where: { slug: slug ?? undefined },
      select: {
        id: true,
        slug: true,
        name: true,
        currentQuestion: true,
        remainingTime: true,
        status: true,
        questionPackageId: true,
        contestId: true,
        round: {
          select: {
            name: true,
          },
        },
        student: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!matchRaw) return null;

    const match = {
      id: matchRaw.id,
      slug: matchRaw.slug,
      name: matchRaw.name,
      contestId: matchRaw.contestId,
      currentQuestion: matchRaw.currentQuestion,
      remainingTime: matchRaw.remainingTime,
      status: matchRaw.status,
      questionPackageId: matchRaw.questionPackageId,
      roundName: matchRaw.round?.name ?? null,
      studentId: matchRaw.student?.id ?? null,
      studentName: matchRaw.student?.fullName ?? null,
    };

    return match;
  }

  static async bgContest(contestId: number) {
    const contest = await prisma.contest.findFirst({
      where: { id: contestId },
      select: {
        mediaFiles: {
          where: { type: "background" },
          select: {
            url: true,
          },
          take: 1,
        },
      },
    });
    return contest?.mediaFiles[0] ?? null;
  }

  static async ListQuestion(questionPackageId: number) {
    const raw = await prisma.questionDetail.findMany({
      where: { questionPackageId },
      orderBy: {
        questionOrder: "asc",
      },
      select: {
        questionOrder: true,
        question: {
          select: {
            id: true,
            content: true,
            difficulty: true,
            questionType: true,
          },
        },
      },
    });

    const listQuestion = raw.map(item => ({
      questionOrder: item.questionOrder,
      id: item.question.id,
      content: item.question.content,
      difficulty: item.question.difficulty,
      questionType: item.question.questionType,
    }));

    return listQuestion;
  }

  static async CurrentQuestion(
    currentQuestion: number,
    questionPackageId: number
  ) {
    const questionId = await prisma.questionDetail.findFirst({
      where: {
        questionOrder: currentQuestion,
        questionPackageId: questionPackageId,
      },
      select: { questionId: true },
    });
    const question = await prisma.question.findUnique({
      where: { id: questionId?.questionId },
      select: {
        id: true,
        isActive: true,
        options: true,
        createdAt: true,
        updatedAt: true,
        intro: true,
        defaultTime: true,
        questionType: true,
        content: true,
        questionMedia: true,
        correctAnswer: true,
        mediaAnswer: true,
        score: true,
        difficulty: true,
        explanation: true,
        questionTopic: {
          select: {
            name: true,
          },
        },
      },
    });

    // Làm phẳng dữ liệu (flatten)
    const flatQuestion = {
      ...question,
      questionTopicName: question?.questionTopic?.name || null,
      questionOrder: currentQuestion,
    };
    return flatQuestion;
  }

  static async ListRescues(matchId: number) {
    return prisma.rescue.findMany({
      where: { matchId: matchId },
      select: {
        id: true,
        status: true,
      },
    });
  }

  static async ListContestant(matchId: number) {
    return prisma.group.findMany({
      where: { matchId: matchId },
      select: {
        id: true,
        name: true,
        confirmCurrentQuestion: true,
        user: { select: { username: true } },
        match: {
          select: {
            maxContestantColumn: true,
          },
        },
        contestantMatches: {
          select: {
            registrationNumber: true,
            eliminatedAtQuestionOrder: true,
            rescuedAtQuestionOrder: true,
            status: true,
            contestant: {
              select: {
                student: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            registrationNumber: "asc",
          },
        },
      },
    });
  }

  static async countIn_progress(matchId: number) {
    return prisma.contestantMatch.count({
      where: { matchId: matchId, status: "in_progress" },
    });
  }

  static async countEliminated(matchId: number) {
    return prisma.contestantMatch.count({
      where: { matchId: matchId, status: "eliminated" },
    });
  }

  static async Total(matchId: number) {
    return prisma.contestantMatch.count({
      where: { matchId: matchId, status: { notIn: ["banned"] } },
    });
  }

  static async ScreenControl(matchId: number) {
    return prisma.screenControl.findFirst({
      where: { matchId: matchId },
    });
  }

  static async getListMatchByJudgeId(contestId: number, JudgeId: number) {
    return prisma.match.findMany({
      where: {
        contestId: contestId,
        groups: {
          some: { userId: JudgeId },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }

  static async UpdateMatchBySlug(
    slug: string,
    timeRemaining: number
  ): Promise<Match | null> {
    const match = await prisma.match.findFirst({
      where: { slug: slug },
      select: {
        id: true,
      },
    });
    if (!match) {
      return null;
    }

    return prisma.match.update({
      where: { id: match.id },
      data: { remainingTime: timeRemaining },
    });
  }
}

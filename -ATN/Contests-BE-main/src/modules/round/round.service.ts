import { prisma } from "@/config/database";
import {
  Rounds,
  RoundQueryInput,
  RoundById,
  CreateRoundInput,
  UpdateRoundInput,
} from "@/modules/round";
import { Round } from "@prisma/client";
import { MatchService } from "@/modules/match";

export default class RoundService {
  static async getAll(
    query: RoundQueryInput,
    contestId: number
  ): Promise<{
    rounds: Rounds[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, isActive } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }
    if (contestId !== undefined) {
      whereClause.contestId = contestId;
    }
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { name: { contains: keyword } },
        { contest: { is: { name: { contains: keyword } } } },
      ]);
    }

    const roundRaw = await prisma.round.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        isActive: true,
        index: true,
        endTime: true,
        startTime: true,
        contest: {
          select: {
            name: true,
          },
        },
      },
    });
    const rounds = roundRaw.map(key => ({
      id: key.id,
      name: key.name,
      isActive: key.isActive,
      contestName: key.contest?.name ?? null,
      index: key.index,
      endTime: key.endTime,
      startTime: key.startTime,
    }));
    const total = await prisma.round.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      rounds: rounds,
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

  static async getRoundBy(data: any): Promise<RoundById | null> {
    return prisma.round.findFirst({
      where: {
        ...data,
      },
      select: {
        id: true,
        name: true,
        contestId: true,
        isActive: true,
        index: true,
        endTime: true,
        startTime: true,
        contest: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static async createRound(data: CreateRoundInput): Promise<Round | null> {
    return prisma.round.create({
      data: {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      },
    });
  }

  static async updateRound(
    id: number,
    data: UpdateRoundInput
  ): Promise<Round | null> {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    if (data.contestId !== undefined) {
      updateData.contestId = data.contestId;
    }

    if (data.index !== undefined) {
      updateData.index = data.index;
    }

    if (data.endTime !== undefined) {
      updateData.startTime = new Date(data.endTime);
    }

    if (data.startTime !== undefined) {
      updateData.startTime = new Date(data.startTime);
    }

    return prisma.round.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }
  /** Xóa vòng cùng các trận của vòng (kèm toàn bộ dữ liệu của từng trận). */
  static async deleteRound(id: number): Promise<Round> {
    return prisma.$transaction(async tx => {
      const round = await tx.round.findUniqueOrThrow({ where: { id } });
      const matches = await tx.match.findMany({
        where: { roundId: id },
        select: { id: true },
      });
      await MatchService.deleteMatchesWithData(
        tx,
        matches.map(m => m.id)
      );
      await tx.round.delete({ where: { id } });
      return round;
    });
  }

  static async countContestantsByRoundId(id: number) {
    return prisma.contestant.count({
      where: {
        roundId: id,
      },
    });
  }
  static async getListRound(contestId: number) {
    return prisma.round.findMany({
      where: { isActive: true, contestId: contestId },
      select: {
        id: true,
        name: true,
      },
    });
  }
}

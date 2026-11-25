import { prisma } from "@/config/database";
import {
  UpdateScreenInput,
  CreateScreenInput,
  ScreenQueryInput,
  SceenType,
} from "./screen.schema";
import { ScreenControl } from "@prisma/client";
export default class ScreenService {
  static async getBy(
    data: Partial<ScreenControl>
  ): Promise<ScreenControl | null> {
    return prisma.screenControl.findFirst({
      where: {
        ...data,
      },
    });
  }

  static async create(data: CreateScreenInput): Promise<ScreenControl | null> {
    return prisma.screenControl.create({
      data: {
        ...data,
      },
    });
  }

  static async update(
    id: number,
    data: UpdateScreenInput
  ): Promise<ScreenControl | null> {
    const updateData: any = {};

    if (data.controlKey !== undefined) {
      updateData.controlKey = data.controlKey;
    }
    if (data.controlValue !== undefined) {
      updateData.controlValue = data.controlValue;
    }

    if (data.media !== undefined) {
      updateData.media = data.media;
    }

    if (data.value !== undefined) {
      updateData.value = data.value;
    }

    return prisma.screenControl.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }

  static async delete(id: number): Promise<ScreenControl> {
    return prisma.screenControl.delete({
      where: {
        id: id,
      },
    });
  }

  static async getAlls(query: ScreenQueryInput): Promise<{
    screens: SceenType[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, isActive, matchId } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }
    if (matchId !== undefined) {
      whereClause.matchId = matchId;
    }
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { match: { is: { name: { contains: keyword } } } },
      ]);
    }

    const screenRaw = await prisma.screenControl.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        controlKey: true,
        controlValue: true,
        media: true,
        matchId: true,
        match: {
          select: {
            name: true,
          },
        },
      },
    });
    const screens = screenRaw.map(k => ({
      id: k.id,
      controlKey: k.controlKey,
      controlValue: k.controlValue ?? null,
      matchId: k.matchId,
      matchName: k.match?.name ?? null,
      media: k.media ?? null,
    }));
    const total = await prisma.student.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      screens: screens,
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
}

import { prisma } from "@/config/database";
import {
  ContestQueryInput,
  CreateContestInput,
  UpdateContestInput,
} from "./contest.schema";
import { Contest } from "@prisma/client";
import slugify from "slugify";
import { htmlToPlainText } from "@/utils/html";
import { group } from "console";
export default class ContestService {
  static async getAll(query: ContestQueryInput): Promise<{
    Contest: Contest[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, status } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (status !== undefined) {
      whereClause.status = status;
    }

    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { name: { contains: keyword } },
        { plainText: { contains: keyword } },
        { rule: { contains: keyword } },
        { location: { contains: keyword } },
        { slogan: { contains: keyword } },
      ]);
    }

    const Contest = await prisma.contest.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    const total = await prisma.contest.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      Contest: Contest,
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

  static async getBy(data: any): Promise<Contest | null> {
    return prisma.contest.findFirst({
      where: {
        ...data,
      },
    });
  }

  static async create(data: any): Promise<Contest | null> {
    return prisma.contest.create({
      data: {
        ...data,
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
      const exists = await prisma.contest.findFirst({
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

  static async update(
    id: number,
    data: UpdateContestInput
  ): Promise<Contest | null> {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
      const slug = await ContestService.generateUniqueSlug(data.name);
      updateData.slug = slug;
    }

    if (data.rule !== undefined) {
      updateData.rule = data.rule;
      const textplan = await htmlToPlainText(data.rule);
      updateData.plainText = textplan;
    }

    if (data.startTime !== undefined) {
      updateData.startTime = data.startTime;
    }

    if (data.endTime !== undefined) {
      updateData.endTime = data.endTime;
    }

    if (data.slogan !== undefined) {
      updateData.slogan = data.slogan;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    return prisma.contest.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }

  static async delete(id: number): Promise<Contest> {
    return prisma.contest.delete({
      where: {
        id: id,
      },
    });
  }

  static async ListContest(slug: string) {
    return prisma.contest.findMany({
      where: { slug: { not: slug }, isActive: true },
      select: {
        id: true,
        name: true,
      },
    });
  }

  static async getListContestByJudgeId(judgeId: number) {
    return prisma.contest.findMany({
      where: {
        matches: {
          some: {
            groups: { some: { userId: judgeId } },
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }
}

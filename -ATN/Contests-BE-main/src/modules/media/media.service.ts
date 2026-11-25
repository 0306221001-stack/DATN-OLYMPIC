import { prisma } from "@/config/database";
import { Media } from "@prisma/client";
import {
  CreateMediaInput,
  MediaQueryInput,
  UpdateMediaInput,
} from "./media.schema";
export default class MediaService {
  static async getAll(
    query: MediaQueryInput,
    contestId: number
  ): Promise<{
    medias: Media[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, type } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (type !== undefined) {
      whereClause.type = type;
    }

    const medias = await prisma.media.findMany({
      where: {
        ...whereClause,
        contestId: contestId,
      },
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.media.count({
      where: { ...whereClause, contestId: contestId },
    });
    const totalPages = Math.ceil(total / limit);
    return {
      medias: medias,
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

  static async getBy(data: any): Promise<Media | null> {
    return prisma.media.findFirst({
      where: {
        ...data,
      },
    });
  }

  static async create(data: CreateMediaInput): Promise<Media | null> {
    return prisma.media.create({
      data: {
        ...data,
      },
    });
  }

  static async update(
    id: number,
    data: UpdateMediaInput
  ): Promise<Media | null> {
    const updateData: any = {};

    if (data.url !== undefined) {
      updateData.url = data.url;
    }

    if (data.type !== undefined) {
      updateData.type = data.type;
    }

    return prisma.media.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }
  static async delete(id: number): Promise<Media> {
    return prisma.media.delete({
      where: {
        id: id,
      },
    });
  }
}

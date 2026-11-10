import { prisma } from "@/config/database";
import {
  CreateClassVideoInput,
  UpdateClassVideoInput,
  ClassVideoQueryInput,
  ClassVideo,
} from "./classVideo.schema";
export default class ClassVideoService {
  static async getAll(
    query: ClassVideoQueryInput,
    contestId: number
  ): Promise<{
    classVideos: ClassVideo[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { name: { contains: keyword } },
        { class: { is: { name: { contains: keyword } } } },
      ]);
    }

    const classVideoRaw = await prisma.classVideo.findMany({
      where: { ...whereClause, contestId: contestId },
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slogan: true,
        videos: true,
        classId: true,
        class: {
          select: {
            name: true,
          },
        },
      },
    });
    const classVideos = classVideoRaw.map(key => ({
      id: key.id,
      name: key.name,
      slogan: key.slogan ?? null,
      videos: key.videos,
      classId: key.classId,
      className: key.class?.name ?? undefined,
    }));
    const total = await prisma.classVideo.count({
      where: { contestId: contestId, ...whereClause },
    });
    const totalPages = Math.ceil(total / limit);
    return {
      classVideos: classVideos,
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

  static async getBy(data: any): Promise<ClassVideo | null> {
    return prisma.classVideo.findFirst({
      where: {
        ...data,
      },
      select: {
        id: true,
        name: true,
        slogan: true,
        videos: true,
        classId: true,
        class: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static async create(data: CreateClassVideoInput): Promise<ClassVideo | null> {
    return prisma.classVideo.create({
      data: {
        ...data,
      },
    });
  }

  static async update(
    id: number,
    data: UpdateClassVideoInput
  ): Promise<ClassVideo | null> {
    const updateData: any = {};

    if (data.videos !== undefined) {
      updateData.videos = data.videos;
    }

    if (data.classId !== undefined) {
      updateData.classId = data.classId;
    }

    if (data.slogan !== undefined) {
      updateData.slogan = data.slogan;
    }

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    return prisma.classVideo.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }
  static async delete(id: number): Promise<ClassVideo> {
    return prisma.classVideo.delete({
      where: {
        id: id,
      },
    });
  }
}

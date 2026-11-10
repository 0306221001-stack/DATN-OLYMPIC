import { prisma } from "@/config/database";
import { Class } from "@prisma/client";
import {
  ClassQueryInput,
  CreateClassInput,
  UpdateClassInput,
  Classes,
  ClassById,
} from "@/modules/class";
import { nativeEnum } from "zod";
export default class ClassService {
  static async updateClass(
    id: number,
    data: UpdateClassInput
  ): Promise<Class | null> {
    const updateData: any = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.schoolId !== undefined) {
      updateData.schoolId = data.schoolId;
    }
    return prisma.class.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }
  static async deleteClass(id: number): Promise<Class> {
    return prisma.class.delete({
      where: {
        id: id,
      },
    });
  }
  static async getClassBy(data: any): Promise<ClassById | null> {
    return prisma.class.findFirst({
      where: {
        ...data,
      },
      select: {
        id: true,
        name: true,
        schoolId: true,
        isActive: true,
        school: {
          select: {
            name: true,
          },
        },
      },
    });
  }
  static async createClass(data: CreateClassInput): Promise<Class | null> {
    return prisma.class.create({
      data: {
        ...data,
      },
    });
  }
  static async getAllClass(query: ClassQueryInput): Promise<{
    classes: Classes[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, isActive, schoolId } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }
    if (schoolId !== undefined) {
      whereClause.schoolId = schoolId;
    }
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { name: { contains: keyword } },
        { school: { name: { contains: keyword } } },
      ]);
    }

    const classRaw = await prisma.class.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        isActive: true,
        school: {
          select: {
            name: true,
          },
        },
      },
    });
    const classes = classRaw.map(key => ({
      id: key.id,
      name: key.name,
      isActive: key.isActive,
      shoolName: key.school?.name ?? null,
    }));
    const total = await prisma.class.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      classes: classes,
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
  static async countClassVieoByClassId(id: number) {
    return prisma.classVideo.count({
      where: {
        classId: id,
      },
    });
  }
  static async countClassStudentClassId(id: number) {
    return prisma.student.count({
      where: {
        classId: id,
      },
    });
  }

  static async getClassBySchoolId(schoolId: number) {
    const classRaw = await prisma.class.findMany({
      where: { schoolId: schoolId, isActive: true },
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
    });
    const classes = classRaw.map(key => ({
      id: key.id,
      name: key.name + " - " + key.school.name,
    }));
    return classes;
  }

  static async listClassesWithSchool(search?: string) {
    const whereClause: any = {
      isActive: true,
      school: {
        isActive: true,
      },
    };

    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { name: { contains: keyword } },
        { school: { name: { contains: keyword } } },
      ]);
    }

    return prisma.class.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        isActive: true,
        school: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ school: { name: "asc" } }, { name: "asc" }],
    });
  }
  static async listClass() {
    const classRaw = await prisma.class.findMany({
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
      where: {
        isActive: true,
      },
    });
    const classes = classRaw.map(key => ({
      id: key.id,
      name: key.name + " - " + key.school.name,
    }));

    return classes;
  }
}

import { prisma } from "@/config/database";
import { School } from "@prisma/client";
import {
  CreateSchoolInput,
  UpdateShoolInput,
  SchoolQueryInput,
} from "@/modules/school";
export default class SchoolService {
  static async existingEmail(email: string): Promise<boolean> {
    const school = await prisma.school.findUnique({
      where: {
        email: email,
      },
    });
    return !!school;
  }
  static async existingPhone(phone: string): Promise<boolean> {
    const school = await prisma.school.findUnique({
      where: {
        phone: phone,
      },
    });
    return !!school;
  }
  static async createSchool(data: CreateSchoolInput): Promise<School | null> {
    return prisma.school.create({
      data: {
        ...data,
      },
    });
  }
  static async getSchoolBy(data: any): Promise<School | null> {
    return prisma.school.findFirst({
      where: {
        ...data,
      },
    });
  }
  static async updateSchool(
    id: number,
    data: UpdateShoolInput
  ): Promise<School | null> {
    const updateData: any = {};
    if (data.phone !== undefined) {
      updateData.name = data.name;
    }
    if (data.email !== undefined) {
      updateData.email = data.email;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone;
    }
    if (data.address !== undefined) {
      updateData.address = data.address;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    return prisma.school.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }
  static async existingEmailForUpdate(
    email: string,
    userId: number
  ): Promise<boolean> {
    const school = await prisma.school.findFirst({
      where: {
        email: email,
        NOT: { id: userId },
      },
    });
    return !!school;
  }
  static async existingPhoneForUpdate(
    email: string,
    userId: number
  ): Promise<boolean> {
    const school = await prisma.school.findFirst({
      where: {
        email: email,
        NOT: { id: userId },
      },
    });
    return !!school;
  }
  static async countClassBySchoolId(schoolId: number): Promise<number> {
    return prisma.class.count({
      where: {
        schoolId: schoolId,
      },
    });
  }
  static async deleteSchool(id: number): Promise<School> {
    return prisma.school.delete({
      where: {
        id: id,
      },
    });
  }
  static async getAllShool(query: SchoolQueryInput): Promise<{
    schools: Omit<School, "createdAt" | "updatedAt">[];
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
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { name: { contains: keyword } },
        { email: { contains: keyword } },
        { phone: { contains: keyword } },
        { address: { contains: keyword } },
      ]);
    }

    const schools = await prisma.school.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
      },
    });
    const total = await prisma.school.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      schools: schools,
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
  static async listSchool() {
    return prisma.school.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
    });
  }
}

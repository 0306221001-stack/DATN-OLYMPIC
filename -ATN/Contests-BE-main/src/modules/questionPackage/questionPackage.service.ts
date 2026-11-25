import { prisma } from "@/config/database";
import { QuestionPackage } from "@prisma/client";
import {
  CreateQuestionPackageInput,
  UpdateQuestionPackageInput,
  QuestionPackageQueryInput,
  QuestionPackageResponse,
  QuestionPackageDetailResponse,
  BatchDeleteQuestionPackagesInput,
  BatchDeleteResponse,
} from "./questionPackage.schema";

export default class QuestionPackageService {
  /**
   * Create a new question package
   */
  static async createQuestionPackage(
    data: CreateQuestionPackageInput
  ): Promise<QuestionPackage> {
    return prisma.questionPackage.create({
      data: {
        name: data.name,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Get question package by ID
   */
  static async getQuestionPackageById(
    id: number
  ): Promise<QuestionPackageDetailResponse | null> {
    const questionPackage = await prisma.questionPackage.findFirst({
      where: { id },
      include: {
        questionDetails: {
          select: {
            questionOrder: true,
            isActive: true,
            question: {
              select: {
                id: true,
                questionType: true,
                difficulty: true,
              },
            },
          },
          where: {
            isActive: true,
          },
          orderBy: {
            questionOrder: "asc",
          },
        },
        matches: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          },
          where: { isActive: true },
        },
        _count: {
          select: {
            questionDetails: true,
            matches: true,
          },
        },
      },
    });

    if (!questionPackage) return null;

    return {
      id: questionPackage.id,
      name: questionPackage.name,
      isActive: questionPackage.isActive,
      questionDetailsCount: questionPackage._count.questionDetails,
      matchesCount: questionPackage._count.matches,
      createdAt: questionPackage.createdAt,
      updatedAt: questionPackage.updatedAt,
      questionDetails: questionPackage.questionDetails,
      matches: questionPackage.matches,
    };
  }

  /**
   * Update question package
   */
  static async updateQuestionPackage(
    id: number,
    data: UpdateQuestionPackageInput
  ): Promise<QuestionPackage | null> {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    return prisma.questionPackage.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Soft delete question package (set isActive to false)
   */
  static async deleteQuestionPackage(
    id: number
  ): Promise<QuestionPackage | null> {
    return prisma.questionPackage.delete({
      where: { id },
    });
  }

  /**
   * Check if question package exists
   */
  static async questionPackageExists(id: number): Promise<boolean> {
    const questionPackage = await prisma.questionPackage.findFirst({
      where: { id },
    });
    return !!questionPackage;
  }

  /**
   * Check if question package name already exists
   */
  static async nameExists(name: string, excludeId?: number): Promise<boolean> {
    const whereClause: any = { name };

    if (excludeId) {
      whereClause.NOT = { id: excludeId };
    }

    const questionPackage = await prisma.questionPackage.findFirst({
      where: whereClause,
    });
    return !!questionPackage;
  }

  /**
   * Get all question packages with pagination and filtering
   */
  static async getAllQuestionPackages(
    queryInput: QuestionPackageQueryInput
  ): Promise<{
    questionPackages: QuestionPackageResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Apply defaults if values are undefined
    const page = queryInput.page || 1;
    const limit = queryInput.limit || 10;
    const search = queryInput.search;
    const isActive = queryInput.isActive;
    const sortBy = queryInput.sortBy || "createdAt";
    const sortOrder = queryInput.sortOrder || "desc";

    const skip = (page - 1) * limit;

    const whereClause: any = {};

    // Apply filters
    if (search) {
      whereClause.name = {
        contains: search,
      };
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    // Count total records
    const total = await prisma.questionPackage.count({
      where: whereClause,
    });

    // Get paginated results
    const questionPackages = await prisma.questionPackage.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: {
            questionDetails: true,
            matches: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      questionPackages: questionPackages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        isActive: pkg.isActive,
        questionDetailsCount: pkg._count.questionDetails,
        matchesCount: pkg._count.matches,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt,
      })),
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

  /**
   * Get active question packages (for dropdown/select)
   */
  static async getActiveQuestionPackages(): Promise<
    Array<{ id: number; name: string }>
  > {
    return prisma.questionPackage.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Batch delete question packages (soft delete)
   */
  static async batchDeleteQuestionPackages(
    data: BatchDeleteQuestionPackagesInput
  ): Promise<BatchDeleteResponse> {
    const { ids } = data;
    const successfulIds: number[] = [];
    const failedIds: Array<{ id: number; reason: string }> = [];

    // Process each ID individually to handle partial failures
    for (const id of ids) {
      try {
        // Check if question package exists and is not already deleted
        const questionPackage = await prisma.questionPackage.findFirst({
          where: { id, isActive: true },
        });

        if (!questionPackage) {
          failedIds.push({
            id,
            reason: "Gói câu hỏi không tồn tại hoặc đã bị xóa",
          });
          continue;
        }

        // Check if there are active question details associated with this package
        const questionDetailsCount = await prisma.questionDetail.count({
          where: { questionPackageId: id, isActive: true },
        });

        if (questionDetailsCount > 0) {
          failedIds.push({
            id,
            reason: `Không thể xóa gói câu hỏi có ${questionDetailsCount} câu hỏi đang hoạt động`,
          });
          continue;
        }

        // Check if there are active matches using this package
        const matchesCount = await prisma.match.count({
          where: { questionPackageId: id, isActive: true },
        });

        if (matchesCount > 0) {
          failedIds.push({
            id,
            reason: `Không thể xóa gói câu hỏi đang được sử dụng trong ${matchesCount} trận đấu`,
          });
          continue;
        }

        // Hard delete the question package
        await prisma.questionPackage.delete({
          where: { id },
        });

        successfulIds.push(id);
      } catch (error) {
        failedIds.push({
          id,
          reason: `Lỗi hệ thống khi xóa gói câu hỏi: ${
            error instanceof Error ? error.message : "Lỗi không xác định"
          }`,
        });
      }
    }

    return {
      totalRequested: ids.length,
      successful: successfulIds.length,
      failed: failedIds.length,
      successfulIds,
      failedIds,
    };
  }

  static async getListQuestionPackage() {
    return prisma.questionPackage.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }
}

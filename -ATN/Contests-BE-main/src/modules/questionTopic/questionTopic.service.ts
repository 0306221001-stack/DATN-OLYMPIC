import { prisma } from "@/config/database";
import { QuestionTopic } from "@prisma/client";
import {
  CreateQuestionTopicInput,
  UpdateQuestionTopicInput,
  QuestionTopicQueryInput,
  QuestionTopicResponse,
  QuestionTopicDetailResponse,
  BatchDeleteQuestionTopicsInput,
  BatchDeleteResponse,
} from "./questionTopic.schema";

export default class QuestionTopicService {
  /**
   * Create a new question topic
   */  static async createQuestionTopic(
    data: CreateQuestionTopicInput
  ): Promise<QuestionTopic> {
    return prisma.questionTopic.create({
      data: {
        name: data.name,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Get question topic by ID
   */
  static async getQuestionTopicById(
    id: number
  ): Promise<QuestionTopicDetailResponse | null> {
    const questionTopic = await prisma.questionTopic.findFirst({
      where: { id },
      include: {
        questions: {
          select: {
            id: true,
            questionType: true,
            difficulty: true,
          },
          where: { isActive: true },
        },
        _count: {
          select: { questions: true },
        },
      },
    });

    if (!questionTopic) return null;

    return {
      id: questionTopic.id,
      name: questionTopic.name,
      isActive: questionTopic.isActive,
      questionsCount: questionTopic._count.questions,
      createdAt: questionTopic.createdAt,
      updatedAt: questionTopic.updatedAt,
      questions: questionTopic.questions,
    };
  }

  /**
   * Update question topic
   */
  static async updateQuestionTopic(
    id: number,
    data: UpdateQuestionTopicInput
  ): Promise<QuestionTopic | null> {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    return prisma.questionTopic.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Soft delete question topic (set isActive to false)
   */
  static async deleteQuestionTopic(id: number): Promise<QuestionTopic | null> {
    return prisma.questionTopic.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Check if question topic exists
   */
  static async questionTopicExists(id: number): Promise<boolean> {
    const questionTopic = await prisma.questionTopic.findFirst({
      where: { id },
    });
    return !!questionTopic;
  }

  /**
   * Check if question topic name already exists
   */
  static async nameExists(name: string, excludeId?: number): Promise<boolean> {
    const whereClause: any = { name };
    
    if (excludeId) {
      whereClause.NOT = { id: excludeId };
    }

    const questionTopic = await prisma.questionTopic.findFirst({
      where: whereClause,
    });
    return !!questionTopic;
  }
  /**
   * Get all question topics with pagination and filtering
   */
  static async getAllQuestionTopics(
    queryInput: QuestionTopicQueryInput
  ): Promise<{
    questionTopics: QuestionTopicResponse[];
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

    const whereClause: any = {};    // Apply filters
    if (search) {
      whereClause.name = {
        contains: search,
      };
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    // Count total records
    const total = await prisma.questionTopic.count({
      where: whereClause,
    });

    // Get paginated results
    const questionTopics = await prisma.questionTopic.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      questionTopics: questionTopics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        isActive: topic.isActive,
        questionsCount: topic._count.questions,
        createdAt: topic.createdAt,
        updatedAt: topic.updatedAt,
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
   * Get active question topics (for dropdown/select)
   */
  static async getActiveQuestionTopics(): Promise<
    Array<{ id: number; name: string }>
  > {
    return prisma.questionTopic.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Batch delete question topics (soft delete)
   */
  static async batchDeleteQuestionTopics(
    data: BatchDeleteQuestionTopicsInput
  ): Promise<BatchDeleteResponse> {
    const { ids } = data;
    const successfulIds: number[] = [];
    const failedIds: Array<{ id: number; reason: string }> = [];

    // Process each ID individually to handle partial failures
    for (const id of ids) {
      try {
        // Check if question topic exists and is not already deleted
        const questionTopic = await prisma.questionTopic.findFirst({
          where: { id, isActive: true },
        });

        if (!questionTopic) {
          failedIds.push({
            id,
            reason: "Chủ đề câu hỏi không tồn tại hoặc đã bị xóa",
          });
          continue;
        }

        // Check if there are active questions associated with this topic
        const questionsCount = await prisma.question.count({
          where: { questionTopicId: id, isActive: true },
        });

        if (questionsCount > 0) {
          failedIds.push({
            id,
            reason: `Không thể xóa chủ đề có ${questionsCount} câu hỏi đang hoạt động`,
          });
          continue;
        }

        // Soft delete the question topic
        // Hard delete the question topic
        await prisma.questionTopic.delete({
          where: { id },
        });

        successfulIds.push(id);
      } catch (error) {
        failedIds.push({
          id,
          reason: `Lỗi hệ thống khi xóa chủ đề câu hỏi: ${error instanceof Error ? error.message : "Lỗi không xác định"}`,
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
}
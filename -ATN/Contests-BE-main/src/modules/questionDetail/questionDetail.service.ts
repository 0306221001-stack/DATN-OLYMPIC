import { prisma } from "@/config/database";
import { QuestionDetail } from "@prisma/client";
import {
  CreateQuestionDetailInput,
  UpdateQuestionDetailInput,
  QuestionDetailQueryInput,
  QuestionDetailListResponse,
  QuestionDetailStatsResponse,
  BulkCreateQuestionDetailsInput,
  ReorderQuestionsInput,
  BatchDeleteQuestionDetailsInput,
  BatchDeleteResponse,
  SyncQuestionsInPackageInput
} from "./questionDetail.schema";

export default class QuestionDetailService {

  /**
   * Đồng bộ hóa (thêm, sửa, xóa) danh sách câu hỏi trong một gói
   * @param packageId ID của gói câu hỏi
   * @param desiredQuestions Mảng trạng thái câu hỏi mong muốn từ client
   */
  static async syncQuestionsInPackage(
    packageId: number,
    desiredQuestions: SyncQuestionsInPackageInput['questions']
  ) {
    // b1: Lấy danh sách câu hỏi hiện tại trong gói từ DB
    const currentDetails = await prisma.questionDetail.findMany({
      where: { questionPackageId: packageId },
    });

    // Sử dụng Set để tra cứu ID hiệu quả hơn
    const currentQuestionIds = new Set(currentDetails.map(d => d.questionId));
    const desiredQuestionIds = new Set(desiredQuestions.map(d => d.questionId));

    // b3: Xác định các câu hỏi cần thêm mới
    const toAdd = desiredQuestions
      .filter(d => !currentQuestionIds.has(d.questionId))
      .map(d => ({
        questionPackageId: packageId,
        questionId: d.questionId,
        questionOrder: d.questionOrder,
        isActive: true, // Mặc định là active khi thêm mới
      }));

    // Xác định các câu hỏi cần xóa
    const toRemoveIds = currentDetails
      .filter(d => !desiredQuestionIds.has(d.questionId))
      .map(d => d.questionId);

    // b4: Xác định các câu hỏi cần cập nhật thứ tự
    const toUpdate = desiredQuestions
      .filter(d => currentQuestionIds.has(d.questionId))
      .map(d => {
        const current = currentDetails.find(cd => cd.questionId === d.questionId);
        // Chỉ cập nhật nếu thứ tự thay đổi
        if (current && current.questionOrder !== d.questionOrder) {
          return {
            where: {
              questionId_questionPackageId: {
                questionId: d.questionId,
                questionPackageId: packageId,
              },
            },
            data: { questionOrder: d.questionOrder },
          };
        }
        return null;
      })
      .filter(Boolean); // Loại bỏ các item null không cần cập nhật

    // Thực hiện tất cả các thao tác trong một transaction
    const [addedResult, removedResult, ...updatedResults] = await prisma.$transaction([
      // Thao tác thêm
      prisma.questionDetail.createMany({
        data: toAdd,
        skipDuplicates: true, // Bỏ qua nếu có lỗi trùng lặp (dù đã lọc)
      }),
      // Thao tác xóa
      prisma.questionDetail.deleteMany({
        where: {
          questionPackageId: packageId,
          questionId: { in: toRemoveIds },
        },
      }),
      // Thao tác cập nhật
      ...toUpdate.map(updateOp => prisma.questionDetail.update(updateOp!)),
    ]);

    // b5: Trả về kết quả tóm tắt
    return {
      packageId,
      added: addedResult.count,
      removed: removedResult.count,
      updated: updatedResults.length,
      total: desiredQuestions.length,
    };
  }


  /**
   * Create a new question detail relationship
   */
  static async createQuestionDetail(
    data: CreateQuestionDetailInput
  ): Promise<QuestionDetail> {
    return prisma.questionDetail.create({
      data: {
        questionId: data.questionId,
        questionPackageId: data.questionPackageId,
        questionOrder: data.questionOrder,
        isActive: data.isActive ?? true,
      },
    });
  }
  /**
   * Get question detail by composite key
   */
  static async getQuestionDetailById(
    questionId: number,
    questionPackageId: number
  ): Promise<QuestionDetailListResponse | null> {
    const questionDetail = await prisma.questionDetail.findFirst({
      where: {
        questionId,
        questionPackageId,
      },
      include: {
        question: {
          select: {
            id: true,
            questionType: true,
            difficulty: true,
            defaultTime: true,
            score: true,
          },
        },
        questionPackage: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!questionDetail) return null;

    return {
      questionId: questionDetail.questionId,
      questionPackageId: questionDetail.questionPackageId,
      questionOrder: questionDetail.questionOrder,
      isActive: questionDetail.isActive,
      createdAt: questionDetail.createdAt,
      updatedAt: questionDetail.updatedAt,
      question: questionDetail.question,
      questionPackage: questionDetail.questionPackage,
    };
  }
  /**
   * Update question detail
   */
  static async updateQuestionDetail(
    questionId: number,
    questionPackageId: number,
    data: UpdateQuestionDetailInput
  ): Promise<QuestionDetail | null> {
    return prisma.$transaction(async tx => {
      const updateData: any = {};

      // Handle question order update with automatic reordering
      if (data.questionOrder !== undefined) {
        // Get current question detail
        const currentDetail = await tx.questionDetail.findFirst({
          where: {
            questionId,
            questionPackageId,
          },
        });

        if (!currentDetail) {
          throw new Error("Question detail not found");
        }

        const oldOrder = currentDetail.questionOrder;
        const newOrder = data.questionOrder;

        if (oldOrder !== newOrder) {
          // Check if the new order is already taken by another question
          const existingQuestionAtNewOrder = await tx.questionDetail.findFirst({
            where: {
              questionPackageId,
              questionOrder: newOrder,
              isActive: true,
              NOT: {
                questionId,
              },
            },
          });

          if (existingQuestionAtNewOrder) {
            // If moving to a position with existing question, shift others
            if (newOrder < oldOrder) {
              // Moving up: shift questions down that are between newOrder and oldOrder
              await tx.questionDetail.updateMany({
                where: {
                  questionPackageId,
                  questionOrder: {
                    gte: newOrder,
                    lt: oldOrder,
                  },
                  isActive: true,
                },
                data: {
                  questionOrder: {
                    increment: 1,
                  },
                },
              });
            } else {
              // Moving down: shift questions up that are between oldOrder and newOrder
              await tx.questionDetail.updateMany({
                where: {
                  questionPackageId,
                  questionOrder: {
                    gt: oldOrder,
                    lte: newOrder,
                  },
                  isActive: true,
                },
                data: {
                  questionOrder: {
                    decrement: 1,
                  },
                },
              });
            }
          }
        }

        updateData.questionOrder = data.questionOrder;
      }

      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
      }

      // Update the target question detail
      return tx.questionDetail.update({
        where: {
          questionId_questionPackageId: {
            questionId,
            questionPackageId,
          },
        },
        data: updateData,
      });
    });
  }
  /**
   * Remove question from package (delete)
   */
  static async deleteQuestionDetail(
    questionId: number,
    questionPackageId: number
  ): Promise<QuestionDetail | null> {
    return prisma.$transaction(async tx => {
      // Get the question detail to know its order before deleting
      const questionDetail = await tx.questionDetail.findFirst({
        where: {
          questionId,
          questionPackageId,
        },
      });

      if (!questionDetail) {
        throw new Error("Question detail not found");
      }

      const deletedOrder = questionDetail.questionOrder;

      // Delete the question detail
      const deleted = await tx.questionDetail.delete({
        where: {
          questionId_questionPackageId: {
            questionId,
            questionPackageId,
          },
        },
      });

      // Shift up all questions with order greater than the deleted one
      await tx.questionDetail.updateMany({
        where: {
          questionPackageId,
          questionOrder: {
            gt: deletedOrder,
          },
          isActive: true,
        },
        data: {
          questionOrder: {
            decrement: 1,
          },
        },
      });

      return deleted;
    });
  }
  /**
   * Soft delete question detail (set isActive to false)
   */
  static async softDeleteQuestionDetail(
    questionId: number,
    questionPackageId: number
  ): Promise<QuestionDetail | null> {
    return prisma.$transaction(async tx => {
      // Get the question detail to know its order before soft deleting
      const questionDetail = await tx.questionDetail.findFirst({
        where: {
          questionId,
          questionPackageId,
        },
      });

      if (!questionDetail) {
        throw new Error("Question detail not found");
      }

      const deletedOrder = questionDetail.questionOrder;

      // Soft delete the question detail
      const softDeleted = await tx.questionDetail.update({
        where: {
          questionId_questionPackageId: {
            questionId,
            questionPackageId,
          },
        },
        data: { isActive: false },
      });

      // Shift up all active questions with order greater than the soft deleted one
      await tx.questionDetail.updateMany({
        where: {
          questionPackageId,
          questionOrder: {
            gt: deletedOrder,
          },
          isActive: true,
        },
        data: {
          questionOrder: {
            decrement: 1,
          },
        },
      });

      return softDeleted;
    });
  }

  /**
   * Check if question detail exists
   */
  static async questionDetailExists(
    questionId: number,
    questionPackageId: number
  ): Promise<boolean> {
    const questionDetail = await prisma.questionDetail.findFirst({
      where: {
        questionId,
        questionPackageId,
      },
    });
    return !!questionDetail;
  }

  /**
   * Check if question order already exists in the package
   */
  static async questionOrderExists(
    questionPackageId: number,
    questionOrder: number,
    excludeQuestionId?: number
  ): Promise<boolean> {
    const whereClause: any = {
      questionPackageId,
      questionOrder,
      isActive: true,
    };

    if (excludeQuestionId) {
      whereClause.NOT = { questionId: excludeQuestionId };
    }

    const questionDetail = await prisma.questionDetail.findFirst({
      where: whereClause,
    });
    return !!questionDetail;
  }

  /**
   * Get all question details with pagination and filtering
   */
  static async getAllQuestionDetails(
    queryInput: QuestionDetailQueryInput
  ): Promise<{
    questionDetails: QuestionDetailListResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const {
      page,
      limit,
      questionPackageId,
      questionId,
      search,
      isActive,
      sortBy,
      sortOrder,
    } = queryInput;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};

    if (questionPackageId !== undefined) {
      whereClause.questionPackageId = questionPackageId;
    }

    if (questionId !== undefined) {
      whereClause.questionId = questionId;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }
    if (search) {
      whereClause.OR = [
        {
          question: {
            content: {
              contains: search,
            },
          },
        },
        {
          questionPackage: {
            name: {
              contains: search,
            },
          },
        },
      ];
    }

    // Count total records
    const total = await prisma.questionDetail.count({
      where: whereClause,
    });

    // Get paginated results
    const questionDetails = await prisma.questionDetail.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        question: {
          select: {
            id: true,
            content: true,
            questionType: true,
            difficulty: true,
          },
        },
        questionPackage: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      questionDetails: questionDetails.map(detail => ({
        questionId: detail.questionId,
        questionPackageId: detail.questionPackageId,
        questionOrder: detail.questionOrder,
        isActive: detail.isActive,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
        question: detail.question,
        questionPackage: detail.questionPackage,
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
   * Get questions by package ID with ordering and pagination
   */
  static async getQuestionsByPackageId(
    questionPackageId: number,
    queryInput: {
      page: number;
      limit: number;
      includeInactive?: boolean;
      search?: string;
      questionType?: string;
      difficulty?: string;
      isActive?: boolean;
      sortBy?:
      | "questionOrder"
      | "createdAt"
      | "updatedAt"
      | "difficulty"
      | "questionType";
      sortOrder?: "asc" | "desc";
    }
  ): Promise<{
    packageInfo: {
      id: number;
      name: string;
    } | null;
    questions: QuestionDetailListResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters: {
      totalQuestions: number;
      filteredQuestions: number;
      appliedFilters: {
        questionType?: string;
        difficulty?: string;
        isActive?: boolean;
        search?: string;
      };
    };
  }> {
    const {
      page,
      limit,
      includeInactive = false,
      search,
      questionType,
      difficulty,
      isActive,
      sortBy = "questionOrder",
      sortOrder = "asc",
    } = queryInput;
    const skip = (page - 1) * limit;

    // Get package info
    const packageInfo = await prisma.questionPackage.findFirst({
      where: { id: questionPackageId },
      select: { id: true, name: true },
    });

    // Build where clause for question details
    const whereClause: any = { questionPackageId };

    // Handle includeInactive vs isActive filters
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    } else if (!includeInactive) {
      whereClause.isActive = true;
    }

    // Build question filters
    const questionFilters: any = {};

    if (questionType) {
      questionFilters.questionType = questionType;
    }

    if (difficulty) {
      questionFilters.difficulty = difficulty;
    }
    if (search) {
      questionFilters.content = {
        contains: search,
      };
    }

    // Add question filters to where clause if any exist
    if (Object.keys(questionFilters).length > 0) {
      whereClause.question = questionFilters;
    }

    // Get total count for the package (without filters)
    const totalQuestions = await prisma.questionDetail.count({
      where: {
        questionPackageId,
        isActive: !includeInactive ? true : undefined,
      },
    });

    // Count filtered records
    const filteredTotal = await prisma.questionDetail.count({
      where: whereClause,
    }); // Get paginated results with proper sorting
    let orderByClause: any = {};

    if (sortBy === "questionType" || sortBy === "difficulty") {
      // Sort by question properties
      orderByClause = {
        question: {
          [sortBy]: sortOrder,
        },
      };
    } else {
      // Sort by question detail properties
      orderByClause = {
        [sortBy]: sortOrder,
      };
    }

    const questionDetails = await prisma.questionDetail.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: orderByClause,
      include: {
        question: {
          select: {
            id: true,
            explanation: true,
            content: true,
            questionType: true,
            difficulty: true,
          },
        },
        questionPackage: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(filteredTotal / limit);

    return {
      packageInfo,
      questions: questionDetails.map(detail => ({
        questionId: detail.questionId,
        questionPackageId: detail.questionPackageId,
        questionOrder: detail.questionOrder,
        isActive: detail.isActive,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
        question: detail.question,
        questionPackage: detail.questionPackage,
      })),
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        totalQuestions,
        filteredQuestions: filteredTotal,
        appliedFilters: {
          ...(questionType && { questionType }),
          ...(difficulty && { difficulty }),
          ...(isActive !== undefined && { isActive }),
          ...(search && { search }),
        },
      },
    };
  }
  /**
   * Get packages by question ID with pagination
   */
  static async getPackagesByQuestionId(
    questionId: number,
    queryInput: {
      page: number;
      limit: number;
      includeInactive?: boolean;
      search?: string;
      sortBy?: "questionOrder" | "createdAt" | "updatedAt";
      sortOrder?: "asc" | "desc";
    }
  ): Promise<{
    questionInfo: {
      id: number;
      questionType: string;
      difficulty: string;
    } | null;
    packages: QuestionDetailListResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const {
      page,
      limit,
      includeInactive = false,
      search,
      sortBy = "questionOrder",
      sortOrder = "asc",
    } = queryInput;
    const skip = (page - 1) * limit;

    // Get question info
    const questionInfo = await prisma.question.findFirst({
      where: { id: questionId },
      select: {
        id: true,
        questionType: true,
        difficulty: true,
      },
    });

    // Build where clause
    const whereClause: any = { questionId };

    if (!includeInactive) {
      whereClause.isActive = true;
    }

    // Add search functionality for package names
    if (search) {
      whereClause.questionPackage = {
        name: {
          contains: search,
        },
      };
    }

    // Count total records
    const total = await prisma.questionDetail.count({
      where: whereClause,
    });

    // Get paginated results
    const questionDetails = await prisma.questionDetail.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        question: {
          select: {
            id: true,
            questionType: true,
            difficulty: true,
          },
        },
        questionPackage: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      questionInfo,
      packages: questionDetails.map(detail => ({
        questionId: detail.questionId,
        questionPackageId: detail.questionPackageId,
        questionOrder: detail.questionOrder,
        isActive: detail.isActive,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
        question: detail.question,
        questionPackage: detail.questionPackage,
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
   * Bulk create question details
   */
  static async bulkCreateQuestionDetails(
    data: BulkCreateQuestionDetailsInput
  ): Promise<QuestionDetail[]> {
    const { questionPackageId, questions } = data;

    const questionDetailsData = questions.map(q => ({
      questionId: q.questionId,
      questionPackageId,
      questionOrder: q.questionOrder,
      isActive: true,
    }));

    return prisma.$transaction(
      questionDetailsData.map(detail =>
        prisma.questionDetail.create({ data: detail })
      )
    );
  }

  /**
   * Reorder questions in a package
   */
  static async reorderQuestions(
    data: ReorderQuestionsInput
  ): Promise<QuestionDetail[]> {
    const { questionPackageId, reorders } = data;

    return prisma.$transaction(
      reorders.map(({ questionId, newOrder }) =>
        prisma.questionDetail.update({
          where: {
            questionId_questionPackageId: {
              questionId,
              questionPackageId,
            },
          },
          data: { questionOrder: newOrder },
        })
      )
    );
  }
  /**
   * Get next available question order for a package
   */
  static async getNextQuestionOrder(
    questionPackageId: number
  ): Promise<number> {
    const maxOrder = await prisma.questionDetail.findFirst({
      where: { questionPackageId, isActive: true },
      orderBy: { questionOrder: "desc" },
      select: { questionOrder: true },
    });

    return (maxOrder?.questionOrder || 0) + 1;
  }

  /**
   * Get question detail that has a specific order in a package
   */
  static async getQuestionDetailByOrder(
    questionPackageId: number,
    questionOrder: number
  ): Promise<QuestionDetail | null> {
    return prisma.questionDetail.findFirst({
      where: {
        questionPackageId,
        questionOrder,
        isActive: true,
      },
    });
  }
  /**
   * Swap question orders between two question details in the same package
   */
  static async swapQuestionOrder(
    questionPackageId: number,
    questionId1: number,
    questionId2: number
  ): Promise<{
    updatedQuestion1: QuestionDetail;
    updatedQuestion2: QuestionDetail;
  }> {
    return prisma.$transaction(async tx => {
      // Get both question details
      const question1Detail = await tx.questionDetail.findFirst({
        where: {
          questionId: questionId1,
          questionPackageId,
        },
      });

      const question2Detail = await tx.questionDetail.findFirst({
        where: {
          questionId: questionId2,
          questionPackageId,
        },
      });

      if (!question1Detail || !question2Detail) {
        throw new Error("One or both question details not found");
      }

      const question1Order = question1Detail.questionOrder;
      const question2Order = question2Detail.questionOrder;

      // Update question 1 with question 2's order
      const updatedQuestion1 = await tx.questionDetail.update({
        where: {
          questionId_questionPackageId: {
            questionId: questionId1,
            questionPackageId,
          },
        },
        data: { questionOrder: question2Order },
      });

      // Update question 2 with question 1's original order
      const updatedQuestion2 = await tx.questionDetail.update({
        where: {
          questionId_questionPackageId: {
            questionId: questionId2,
            questionPackageId,
          },
        },
        data: { questionOrder: question1Order },
      });

      return { updatedQuestion1, updatedQuestion2 };
    });
  }

  /**
   * Get question detail statistics
   */
  static async getQuestionDetailStats(): Promise<QuestionDetailStatsResponse> {
    const [totalCount, activeCount, uniqueQuestions, uniquePackages] =
      await Promise.all([
        prisma.questionDetail.count(),
        prisma.questionDetail.count({ where: { isActive: true } }),
        prisma.questionDetail.groupBy({
          by: ["questionId"],
          where: { isActive: true },
        }),
        prisma.questionDetail.groupBy({
          by: ["questionPackageId"],
          where: { isActive: true },
        }),
      ]);

    const uniqueQuestionCount = uniqueQuestions.length;
    const uniquePackageCount = uniquePackages.length;
    const averageQuestionsPerPackage =
      uniquePackageCount > 0
        ? Math.round((activeCount / uniquePackageCount) * 100) / 100
        : 0;

    return {
      totalQuestionDetails: totalCount,
      activeQuestionDetails: activeCount,
      uniqueQuestions: uniqueQuestionCount,
      uniquePackages: uniquePackageCount,
      averageQuestionsPerPackage,
    };
  }

  /**
   * Remove all questions from a package
   */
  static async removeAllQuestionsFromPackage(
    questionPackageId: number
  ): Promise<{ count: number }> {
    const result = await prisma.questionDetail.deleteMany({
      where: { questionPackageId },
    });
    return result;
  }

  /**
   * Check if question exists in the system
   */
  static async questionExists(questionId: number): Promise<boolean> {
    const question = await prisma.question.findFirst({
      where: { id: questionId },
    });
    return !!question;
  }
  /**
   * Check if question package exists in the system
   */
  static async questionPackageExists(
    questionPackageId: number
  ): Promise<boolean> {
    const questionPackage = await prisma.questionPackage.findFirst({
      where: { id: questionPackageId },
    });
    return !!questionPackage;
  }
  /**
   * Batch delete question details
   */
  static async batchDeleteQuestionDetails(
    data: BatchDeleteQuestionDetailsInput
  ): Promise<BatchDeleteResponse> {
    const result: BatchDeleteResponse = {
      totalRequested: data.items.length,
      successful: 0,
      failed: 0,
      successfulItems: [],
      failedItems: [],
    };

    // Group items by questionPackageId to normalize orders per package
    const packageIds = new Set<number>();

    // Process each question detail individually
    for (const item of data.items) {
      try {
        // Check if the question detail exists and is active
        const existingDetail = await prisma.questionDetail.findFirst({
          where: {
            questionId: item.questionId,
            questionPackageId: item.questionPackageId,
            isActive: true,
          },
        });

        if (!existingDetail) {
          result.failed++;
          result.failedItems.push({
            questionId: item.questionId,
            questionPackageId: item.questionPackageId,
            reason: "Chi tiết câu hỏi không tồn tại hoặc đã bị xóa trước đó",
          });
          continue;
        }

        // Check if this question detail is being used in any active matches
        const activeMatches = await prisma.contestantMatch.findFirst({
          where: {
            match: {
              questionPackage: {
                questionDetails: {
                  some: {
                    questionId: item.questionId,
                    questionPackageId: item.questionPackageId,
                  },
                },
              },
              isActive: true,
              status: {
                in: ["upcoming", "ongoing"],
              },
            },
          },
        });

        if (activeMatches) {
          result.failed++;
          result.failedItems.push({
            questionId: item.questionId,
            questionPackageId: item.questionPackageId,
            reason:
              "Không thể xóa chi tiết câu hỏi đang được sử dụng trong trận đấu đang hoạt động",
          });
          continue;
        }

        // Perform hard delete
        await prisma.questionDetail.delete({
          where: {
            questionId_questionPackageId: {
              questionId: item.questionId,
              questionPackageId: item.questionPackageId,
            },
          },
        });

        // Track which packages need order normalization
        packageIds.add(item.questionPackageId);

        result.successful++;
        result.successfulItems.push({
          questionId: item.questionId,
          questionPackageId: item.questionPackageId,
        });
      } catch (error) {
        result.failed++;
        result.failedItems.push({
          questionId: item.questionId,
          questionPackageId: item.questionPackageId,
          reason: `Lỗi khi xóa: ${error instanceof Error ? error.message : "Lỗi không xác định"
            }`,
        });
      }
    }

    // Normalize question orders for all affected packages
    for (const packageId of packageIds) {
      try {
        await this.normalizeQuestionOrders(packageId);
      } catch (error) {
        // Log error but don't fail the whole operation
        console.error(
          `Failed to normalize orders for package ${packageId}:`,
          error
        );
      }
    }

    return result;
  }

  /**
   * Reorder question orders in a package to fill gaps (normalize)
   * This method ensures sequential order starting from 1
   */
  static async normalizeQuestionOrders(
    questionPackageId: number
  ): Promise<void> {
    // Get all active question details for the package, ordered by current questionOrder
    const questionDetails = await prisma.questionDetail.findMany({
      where: {
        questionPackageId,
        isActive: true,
      },
      orderBy: {
        questionOrder: "asc",
      },
      select: {
        questionId: true,
        questionOrder: true,
      },
    });

    // Update each question detail with normalized order (1, 2, 3, ...)
    const updatePromises = questionDetails.map((detail, index) => {
      const newOrder = index + 1;

      // Only update if the order is different
      if (detail.questionOrder !== newOrder) {
        return prisma.questionDetail.update({
          where: {
            questionId_questionPackageId: {
              questionId: detail.questionId,
              questionPackageId,
            },
          },
          data: {
            questionOrder: newOrder,
          },
        });
      }
      return null;
    });

    // Execute all updates in parallel, filtering out null values
    await Promise.all(updatePromises.filter(promise => promise !== null));
  }

  /**
   * Shift question orders up after a deletion at specific position
   */
  static async shiftQuestionOrdersUp(
    questionPackageId: number,
    deletedOrder: number
  ): Promise<void> {
    await prisma.questionDetail.updateMany({
      where: {
        questionPackageId,
        questionOrder: {
          gt: deletedOrder,
        },
        isActive: true,
      },
      data: {
        questionOrder: {
          decrement: 1,
        },
      },
    });
  }

  /**
   * Insert question at specific order and shift others down
   */
  static async insertQuestionAtOrder(
    questionPackageId: number,
    targetOrder: number
  ): Promise<void> {
    // Shift existing questions down
    await prisma.questionDetail.updateMany({
      where: {
        questionPackageId,
        questionOrder: {
          gte: targetOrder,
        },
        isActive: true,
      },
      data: {
        questionOrder: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Get questions not in a specific package with pagination and filtering
   */
  static async getQuestionsNotInPackage(
    questionPackageId: number,
    queryInput: {
      page: number;
      limit: number;
      search?: string;
      questionType?: string;
      difficulty?: string;
      isActive?: boolean;
      sortBy?: "id" | "createdAt" | "updatedAt" | "difficulty" | "questionType";
      sortOrder?: "asc" | "desc";
    }
  ): Promise<{
    packageInfo: {
      id: number;
      name: string;
    } | null;
    questions: Array<{
      id: number;
      content: string;
      questionType: string;
      difficulty: string;
      defaultTime: number;
      score: number;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters: {
      totalQuestions: number;
      filteredQuestions: number;
      appliedFilters: {
        questionType?: string;
        difficulty?: string;
        isActive?: boolean;
        search?: string;
      };
    };
  }> {
    const {
      page,
      limit,
      search,
      questionType,
      difficulty,
      isActive = true,
      sortBy = "id",
      sortOrder = "asc",
    } = queryInput;
    const skip = (page - 1) * limit;

    // Get package info
    const packageInfo = await prisma.questionPackage.findFirst({
      where: { id: questionPackageId },
      select: { id: true, name: true },
    });

    if (!packageInfo) {
      throw new Error("Không tìm thấy gói câu hỏi");
    }

    // Get IDs of questions already in the package
    const existingQuestionIds = await prisma.questionDetail.findMany({
      where: {
        questionPackageId,
        isActive: true,
      },
      select: {
        questionId: true,
      },
    });

    const existingIds = existingQuestionIds.map(item => item.questionId);

    // Build where clause for questions not in the package
    const whereClause: any = {
      id: {
        notIn: existingIds.length > 0 ? existingIds : [-1], // If no questions in package, use dummy value to avoid empty array
      },
      isActive,
    };

    // Add filters
    if (questionType) {
      whereClause.questionType = questionType;
    }

    if (difficulty) {
      whereClause.difficulty = difficulty;
    }

    if (search) {
      whereClause.content = {
        contains: search,
      };
    }

    // Get total count of all available questions not in package
    const totalQuestions = await prisma.question.count({
      where: {
        id: {
          notIn: existingIds.length > 0 ? existingIds : [-1],
        },
        isActive: true,
      },
    });

    // Count filtered records
    const filteredTotal = await prisma.question.count({
      where: whereClause,
    });

    // Get paginated results with proper sorting
    const questions = await prisma.question.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        content: true,
        questionType: true,
        difficulty: true,
        defaultTime: true,
        score: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalPages = Math.ceil(filteredTotal / limit);

    return {
      packageInfo,
      questions,
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        totalQuestions,
        filteredQuestions: filteredTotal,
        appliedFilters: {
          ...(questionType && { questionType }),
          ...(difficulty && { difficulty }),
          ...(isActive !== undefined && { isActive }),
          ...(search && { search }),
        },
      },
    };
  }
}

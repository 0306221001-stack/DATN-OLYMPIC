import { PrismaClient, Award, AwardType } from "@prisma/client";
import { logger } from "@/utils/logger";
import { CustomError } from "@/middlewares/errorHandler";
import { ERROR_CODES } from "@/constants/errorCodes";
import {
  CreateAwardData,
  CreateAwardByContestData,
  UpdateAwardData,
  GetAwardsQuery,
  AwardResponse,
  AwardListResponse,
  BatchDeleteResult,
} from "./award.schema";
import { prisma } from "@/config/database";
import { match } from "assert";

export default class AwardService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create a new award
   */
  async createAward(data: CreateAwardData): Promise<AwardResponse> {
    try {
      // Check if contest exists
      const contest = await this.prisma.contest.findUnique({
        where: { id: data.contestId },
      });
      if (!contest) {
        throw new CustomError(
          "Contest không tồn tại",
          404,
          ERROR_CODES.CONTEST_NOT_FOUND
        );
      } // Check if contestant exists (if provided)
      if (data.contestantId !== null && data.contestantId !== undefined) {
        const contestant = await this.prisma.contestant.findUnique({
          where: { id: data.contestantId },
        });
        if (!contestant) {
          throw new CustomError(
            "Contestant không tồn tại",
            404,
            ERROR_CODES.CONTESTANT_NOT_FOUND
          );
        }
      }

      const award = await this.prisma.award.create({
        data: {
          name: data.name,
          contestId: data.contestId,
          contestantId: data.contestantId,
          type: data.type,
        },
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          contestant: {
            select: {
              id: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Award created successfully with ID: ${award.id}`);
      return award;
    } catch (error) {
      logger.error("Error creating award:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi tạo giải thưởng",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create award by contest slug
   */
  async createAwardByContestSlug(
    contestSlug: string,
    data: CreateAwardByContestData
  ): Promise<AwardResponse> {
    try {
      // Find contest by slug
      const contest = await this.prisma.contest.findUnique({
        where: { slug: contestSlug },
      });
      if (!contest) {
        throw new CustomError(
          "Contest không tồn tại",
          404,
          ERROR_CODES.CONTEST_NOT_FOUND
        );
      } // Check if contestant exists (if provided)
      if (data.contestantId !== null && data.contestantId !== undefined) {
        const contestant = await this.prisma.contestant.findUnique({
          where: { id: data.contestantId },
        });
        if (!contestant) {
          throw new CustomError(
            "Contestant không tồn tại",
            404,
            ERROR_CODES.CONTESTANT_NOT_FOUND
          );
        }
      }

      const award = await this.prisma.award.create({
        data: {
          name: data.name,
          contestId: contest.id,
          contestantId: data.contestantId,
          type: data.type,
          matchId: data.matchId,
        },
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          contestant: {
            select: {
              id: true,

              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true,
                },
              },
            },
          },
        },
      });

      logger.info(
        `Award created by contest slug successfully with ID: ${award.id}`
      );
      return award;
    } catch (error) {
      logger.error("Error creating award by contest slug:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi tạo giải thưởng",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get award by ID
   */
  async getAwardById(id: number): Promise<AwardResponse> {
    try {
      const award = await this.prisma.award.findUnique({
        where: { id },
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          contestant: {
            select: {
              id: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true,
                },
              },
            },
          },
          match: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!award) {
        throw new CustomError(
          "Giải thưởng không tồn tại",
          404,
          ERROR_CODES.AWARD_NOT_FOUND
        );
      }

      return award;
    } catch (error) {
      logger.error("Error getting award by ID:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi lấy thông tin giải thưởng",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get awards by contest slug
   *
   *
   */

  async getAll(
    query: GetAwardsQuery,
    contestId: number
  ): Promise<{
    awards: AwardResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, matchId } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};
    if (matchId) {
      whereClause.matchId = matchId;
    }

    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { name: { contains: keyword } },
      ]);
    }

    const awardRaw = await prisma.award.findMany({
      where: {
        ...whereClause,
        contestId: contestId,
      },
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        contestant: {
          select: {
            student: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });
    const awards = awardRaw.map(key => ({
      id: key.id,
      name: key.name,
      type: key.type,
      fullName: key.contestant?.student.fullName ?? "Không có",
    }));
    const total = await prisma.award.count({
      where: { contestId: contestId, ...whereClause },
    });
    const totalPages = Math.ceil(total / limit);
    return {
      awards: awards,
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

  /**
   * Get awards with pagination and filtering
   */

  /**
   * Update award
   */
  async updateAward(id: number, data: UpdateAwardData): Promise<AwardResponse> {
    try {
      // Check if award exists
      const existingAward = await this.prisma.award.findUnique({
        where: { id },
      });
      if (!existingAward) {
        throw new CustomError(
          "Giải thưởng không tồn tại",
          404,
          ERROR_CODES.AWARD_NOT_FOUND
        );
      } // Check if contest exists (if contestId is being updated)
      const targetContestId = data.contestId || existingAward.contestId;
      if (data.contestId && data.contestId !== existingAward.contestId) {
        const contest = await this.prisma.contest.findUnique({
          where: { id: data.contestId },
        });
        if (!contest) {
          throw new CustomError(
            "Contest không tồn tại",
            404,
            ERROR_CODES.CONTEST_NOT_FOUND
          );
        }
      } // Check if contestant exists (if provided)
      if (data.contestantId !== null && data.contestantId !== undefined) {
        const contestant = await this.prisma.contestant.findUnique({
          where: { id: data.contestantId },
        });
        if (!contestant) {
          throw new CustomError(
            "Contestant không tồn tại",
            404,
            ERROR_CODES.CONTESTANT_NOT_FOUND
          );
        }
      }

      const updatedAward = await this.prisma.award.update({
        where: { id },
        data: {
          // Update name if provided
          ...(data.name !== undefined && { name: data.name }),
          // Update contestId if provided
          ...(data.contestId !== undefined && { contestId: data.contestId }),
          // Update contestantId if provided (including null to unassign)
          ...(data.contestantId !== undefined && {
            contestantId: data.contestantId,
          }),
          // Update type if provided
          ...(data.type !== undefined && { type: data.type }),
          ...(data.matchId !== undefined && { matchId: data.matchId }),
        },
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          contestant: {
            select: {
              id: true,

              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Award updated successfully with ID: ${id}`);
      return updatedAward;
    } catch (error) {
      logger.error("Error updating award:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi cập nhật giải thưởng",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Delete award
   */
  async deleteAward(id: number): Promise<void> {
    try {
      const existingAward = await this.prisma.award.findUnique({
        where: { id },
      });
      if (!existingAward) {
        throw new CustomError(
          "Giải thưởng không tồn tại",
          404,
          ERROR_CODES.AWARD_NOT_FOUND
        );
      }

      await this.prisma.award.delete({
        where: { id },
      });

      logger.info(`Award deleted successfully with ID: ${id}`);
    } catch (error) {
      logger.error("Error deleting award:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi xóa giải thưởng",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Batch delete awards
   */
  async batchDeleteAwards(ids: number[]): Promise<BatchDeleteResult> {
    try {
      const successIds: number[] = [];
      const failedIds: number[] = [];
      const errors: Array<{ id: number; error: string }> = [];

      // Process each ID individually to handle partial failures
      for (const id of ids) {
        try {
          // Check if award exists
          const existingAward = await this.prisma.award.findUnique({
            where: { id },
          });

          if (!existingAward) {
            failedIds.push(id);
            errors.push({
              id,
              error: `Giải thưởng với ID ${id} không tồn tại`,
            });
            continue;
          }

          // Delete the award
          await this.prisma.award.delete({
            where: { id },
          });

          successIds.push(id);
          logger.info(`Award deleted successfully with ID: ${id}`);
        } catch (error) {
          failedIds.push(id);
          errors.push({
            id,
            error:
              error instanceof Error ? error.message : "Lỗi không xác định",
          });
          logger.error(`Error deleting award with ID ${id}:`, error);
        }
      }

      const result: BatchDeleteResult = {
        successIds,
        failedIds,
        errors,
      };

      logger.info(
        `Batch delete completed. Success: ${successIds.length}, Failed: ${failedIds.length}`
      );
      return result;
    } catch (error) {
      logger.error("Error in batch delete awards:", error);
      throw new CustomError(
        "Lỗi khi xóa nhiều giải thưởng",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async getAwardByType(type: AwardType, matchId: number): Promise<any> {
    const awardRaw = await prisma.award.findFirst({
      where: {
        type: type,
        matchId: matchId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        contestantId: true,
        contestant: {
          select: {
            student: {
              select: {
                fullName: true,
              },
            },
            contestantMatches: {
              select: {
                registrationNumber: true,
              },
            },
          },
        },
      },
    });

    if (!awardRaw) {
      return null;
    }

    const award: any = {
      id: awardRaw?.id,
      name: awardRaw?.name,
      type: awardRaw?.type,
      contestantId: awardRaw?.contestantId,
      fullName: awardRaw?.contestant?.student?.fullName,
      registrationNumber:
        awardRaw?.contestant?.contestantMatches[0]?.registrationNumber,
    };
    return award;
  }

  static async updateAwardContestant(id: number, contestantId: number) {
    return prisma.award.update({
      where: { id },
      data: { contestantId },
    });
  }
}

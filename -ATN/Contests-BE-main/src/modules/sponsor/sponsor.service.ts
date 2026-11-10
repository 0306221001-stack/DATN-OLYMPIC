import { PrismaClient } from "@prisma/client";
import { logger } from "@/utils/logger";
import { CustomError } from "@/middlewares/errorHandler";
import { ERROR_CODES } from "@/constants/errorCodes";
import fs from "fs";
import path from "path";
import { CONFIG } from "@/config/environment";
import {
  CreateSponsorData,
  UpdateSponsorData,
  GetSponsorsQuery,
  SponsorResponse,
  SponsorListResponse,
  BatchDeleteResult,
} from "./sponsor.schema";
import { prisma } from "@/config/database";

export class SponsorService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Get sponsors with pagination and filtering
   */

  /**
   * Get sponsor by ID
   */
  async getSponsorById(id: number): Promise<SponsorResponse> {
    try {
      const sponsor = await this.prisma.sponsor.findUnique({
        where: { id },
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      });

      if (!sponsor) {
        throw new CustomError(
          "Nhà tài trợ không tìm thấy",
          404,
          ERROR_CODES.SPONSOR_NOT_FOUND
        );
      }

      return sponsor as SponsorResponse;
    } catch (error) {
      logger.error("Error getting sponsor by ID:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi lấy thông tin nhà tài trợ",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get sponsors by contest slug
   */
  async getAll(
    query: GetSponsorsQuery,
    contestId: number
  ): Promise<{
    sponsors: SponsorResponse[];
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
      ]);
    }

    const sponsorRaw = await prisma.sponsor.findMany({
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
        logo: true,
        images: true,
        videos: true,
      },
    });

    const sponsors = sponsorRaw.map(key => ({
      id: key.id,
      name: key.name,
      logo: key.logo,
      images: key.images,
      videos: key.videos,
    }));
    const total = await this.prisma.sponsor.count({
      where: { contestId: contestId, ...whereClause },
    });
    const totalPages = Math.ceil(total / limit);
    return {
      sponsors: sponsors,
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
   * Create new sponsor
   */
  async createSponsor(data: CreateSponsorData): Promise<SponsorResponse> {
    try {
      // Validate contest if provided
      if (data.contestId) {
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
      } // Create sponsor
      const sponsor = await this.prisma.sponsor.create({
        data: {
          name: data.name,
          logo: data.logo || null,
          images: data.images || null,
          videos: data.videos || "", // Required field, default empty string
          contestId: data.contestId || null,
        },
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      });

      logger.info(`Sponsor created successfully with ID: ${sponsor.id}`);
      return sponsor as SponsorResponse;
    } catch (error) {
      logger.error("Error creating sponsor:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi tạo nhà tài trợ",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create sponsor by contest slug
   */
  async createSponsorByContestSlug(
    slug: string,
    data: Omit<CreateSponsorData, "contestId">
  ): Promise<SponsorResponse> {
    try {
      // Find contest by slug
      const contest = await this.prisma.contest.findUnique({
        where: { slug },
      });

      if (!contest) {
        throw new CustomError(
          "Contest không tìm thấy",
          404,
          ERROR_CODES.CONTEST_NOT_FOUND
        );
      } // Create sponsor with contest ID
      const sponsor = await this.prisma.sponsor.create({
        data: {
          name: data.name,
          logo: data.logo || null,
          images: data.images || null,
          videos: data.videos || "", // Required field, default empty string
          contestId: contest.id,
        },
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      });

      logger.info(`Sponsor created for contest ${slug} with ID: ${sponsor.id}`);
      return sponsor as SponsorResponse;
    } catch (error) {
      logger.error("Error creating sponsor by contest slug:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi tạo nhà tài trợ cho contest",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update sponsor (PATCH method)
   */
  async updateSponsor(
    id: number,
    data: UpdateSponsorData
  ): Promise<SponsorResponse> {
    try {
      // Check if sponsor exists
      const existingSponsor = await this.prisma.sponsor.findUnique({
        where: { id },
      });
      if (!existingSponsor) {
        throw new CustomError(
          "Nhà tài trợ không tìm thấy",
          404,
          ERROR_CODES.SPONSOR_NOT_FOUND
        );
      }

      // Validate contest if provided
      if (data.contestId !== undefined && data.contestId !== null) {
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
      } // Store old file URLs for cleanup
      const oldFiles = {
        logo: existingSponsor.logo,
        images: existingSponsor.images,
        videos: existingSponsor.videos,
      };

      // Update sponsor
      const updatePayload: any = {};

      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.logo !== undefined) {
        updatePayload.logo = data.logo || null;
        // If setting to null and had previous file, mark for cleanup
        if (!data.logo && oldFiles.logo) {
          this.cleanupFileUrl(oldFiles.logo);
        }
      }
      if (data.images !== undefined) {
        updatePayload.images = data.images || null;
        // If setting to null and had previous file, mark for cleanup
        if (!data.images && oldFiles.images) {
          this.cleanupFileUrl(oldFiles.images);
        }
      }
      if (data.videos !== undefined) {
        updatePayload.videos = data.videos || null;
        // If setting to null and had previous file, mark for cleanup
        if (!data.videos && oldFiles.videos) {
          this.cleanupFileUrl(oldFiles.videos);
        }
      }
      if (data.contestId !== undefined)
        updatePayload.contestId = data.contestId;

      const sponsor = await this.prisma.sponsor.update({
        where: { id },
        data: updatePayload,
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      });

      logger.info(`Sponsor updated successfully: ${sponsor.id}`);
      return sponsor as SponsorResponse;
    } catch (error) {
      logger.error("Error updating sponsor:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi cập nhật nhà tài trợ",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Hard delete sponsor
   */
  async deleteSponsor(id: number): Promise<void> {
    try {
      // Check if sponsor exists
      const existingSponsor = await this.prisma.sponsor.findUnique({
        where: { id },
      });
      if (!existingSponsor) {
        throw new CustomError(
          "Nhà tài trợ không tìm thấy",
          404,
          ERROR_CODES.SPONSOR_NOT_FOUND
        );
      }

      // Hard delete sponsor
      await this.prisma.sponsor.delete({
        where: { id },
      });

      logger.info(`Sponsor hard deleted: ${id}`);
    } catch (error) {
      logger.error("Error deleting sponsor:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi xóa nhà tài trợ",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Batch delete sponsors
   */

  /**
   * Update sponsor media files
   */
  async updateSponsorMedia(
    id: number,
    mediaUrls: { logo?: string; images?: string; videos?: string }
  ): Promise<SponsorResponse> {
    try {
      // Check if sponsor exists
      const existingSponsor = await this.prisma.sponsor.findUnique({
        where: { id },
      });
      if (!existingSponsor) {
        throw new CustomError(
          "Nhà tài trợ không tìm thấy",
          404,
          ERROR_CODES.SPONSOR_NOT_FOUND
        );
      }

      // Update media fields
      const updateData: any = {};
      if (mediaUrls.logo !== undefined) updateData.logo = mediaUrls.logo;
      if (mediaUrls.images !== undefined) updateData.images = mediaUrls.images;
      if (mediaUrls.videos !== undefined) updateData.videos = mediaUrls.videos;

      const sponsor = await this.prisma.sponsor.update({
        where: { id },
        data: updateData,
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      });

      logger.info(`Sponsor media updated successfully: ${sponsor.id}`);
      return sponsor as SponsorResponse;
    } catch (error) {
      logger.error("Error updating sponsor media:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi cập nhật media nhà tài trợ",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get sponsors statistics
   */
  async getSponsorsStatistics(): Promise<{
    totalSponsors: number;
    sponsorsWithContest: number;
    sponsorsWithoutContest: number;
    totalContests: number;
  }> {
    try {
      const [totalSponsors, sponsorsWithContest, totalContests] =
        await Promise.all([
          this.prisma.sponsor.count(),
          this.prisma.sponsor.count({
            where: {
              contestId: { not: null },
            },
          }),
          this.prisma.sponsor
            .groupBy({
              by: ["contestId"],
              where: {
                contestId: { not: null },
              },
            })
            .then(groups => groups.length),
        ]);

      const sponsorsWithoutContest = totalSponsors - sponsorsWithContest;

      return {
        totalSponsors,
        sponsorsWithContest,
        sponsorsWithoutContest,
        totalContests,
      };
    } catch (error) {
      logger.error("Error getting sponsors statistics:", error);
      throw new CustomError(
        "Lỗi khi lấy thống kê nhà tài trợ",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }
  /**
   * Cleanup file from URL
   */
  private cleanupFileUrl(fileUrl: string): void {
    try {
      if (!fileUrl) return;

      // Extract file path from URL
      // Assuming URL format: http://localhost:3000/uploads/sponsors/filename.ext
      const urlParts = fileUrl.split("/");
      const filename = urlParts[urlParts.length - 1];
      const directory = urlParts[urlParts.length - 2];

      if (filename && directory === "sponsors") {
        const filePath = path.join(CONFIG.UPLOAD_DIR, "sponsors", filename);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`Cleaned up file: ${filePath}`);
        }
      }
    } catch (error) {
      logger.error("Error cleaning up file:", error);
    }
  }
}

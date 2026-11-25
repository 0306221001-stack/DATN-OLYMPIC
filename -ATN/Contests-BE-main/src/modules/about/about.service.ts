import { CreateAboutInput, UpdateAboutInput, AboutQueryInput, MediaObject } from "./about.schema";
import prisma from "@/config/client";
import { logger } from "@/utils/logger";
import { PaginationMeta } from "@/utils/response";
import { 
  processAboutUploads,
  validateAboutUploads,
  cleanupAboutTempFiles 
} from "./about.upload";

export default class AboutService {
  
  /**
   * Create new about information
   */
  static async createAbout(data: CreateAboutInput, files?: any) {
    try {
      logger.info("Creating new about information", { data });

      // Validate uploaded files if any
      let mediaData: { logo?: MediaObject[]; banner?: MediaObject[] } = {};
      if (files) {
        const uploadErrors = validateAboutUploads(files);
        if (uploadErrors.length > 0) {
          cleanupAboutTempFiles(
            [...(files.logo || []), ...(files.banner || [])].map((f: any) => f.path)
          );
          throw new Error(`Upload validation failed: ${uploadErrors.join(', ')}`);
        }

        // Process uploads
        mediaData = await processAboutUploads(files);
      }

      const about = await prisma.about.create({
        data: {
          schoolName: data.schoolName,
          website: data.website || null,
          departmentName: data.departmentName || null,
          email: data.email || null,
          fanpage: data.fanpage || null,
          mapEmbedCode: data.mapEmbedCode || null,
          logo: mediaData.logo || data.logo || undefined,
          banner: mediaData.banner || data.banner || undefined,
        },
      });

      logger.info("About information created successfully", { aboutId: about.id });
      return about;
    } catch (error: any) {
      logger.error("Failed to create about information", { error, data });
      throw {
        success: false,
        message: "Không thể tạo thông tin giới thiệu",
        error: error,
      };
    }
  }

  /**
   * Get all about information with pagination and filtering
   */
  static async getAllAbout(query: AboutQueryInput) {
    try {
      const { page, limit, search, isActive } = query;
      const skip = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {};
      
      if (isActive !== undefined) {
        whereClause.isActive = isActive;
      }

      if (search) {
        whereClause.OR = [
          {
            schoolName: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            departmentName: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            email: {
              contains: search,
              mode: 'insensitive'
            }
          }
        ];
      }

      // Get total count for pagination
      const total = await prisma.about.count({ where: whereClause });

      // Get paginated data
      const aboutList = await prisma.about.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      const pagination: PaginationMeta = {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };

      logger.info("Retrieved about information list", { 
        count: aboutList.length, 
        total, 
        page 
      });

      return { aboutList, pagination };
    } catch (error: any) {
      logger.error("Failed to get about information list", { error, query });
      throw {
        success: false,
        message: "Không thể lấy danh sách thông tin giới thiệu",
        error: error,
      };
    }
  }

  /**
   * Get about information by ID
   */
  static async getAboutById(id: number) {
    try {
      logger.info("Getting about information by ID", { id });

      const about = await prisma.about.findUnique({
        where: { id },
      });

      if (!about) {
        logger.warn("About information not found", { id });
        throw {
          success: false,
          message: "Không tìm thấy thông tin giới thiệu",
          error: "About not found",
        };
      }

      logger.info("About information retrieved successfully", { aboutId: about.id });
      return about;
    } catch (error: any) {
      if (error.success === false) {
        throw error;
      }
      logger.error("Failed to get about information", { error, id });
      throw {
        success: false,
        message: "Không thể lấy thông tin giới thiệu",
        error: error,
      };
    }
  }

  /**
   * Update about information
   */
  static async updateAbout(id: number, data: UpdateAboutInput, files?: any) {
    try {
      logger.info("Updating about information", { id, data, files: files ? Object.keys(files) : [] });

      // Check if about exists
      const existingAbout = await prisma.about.findUnique({
        where: { id },
      });

      if (!existingAbout) {
        logger.warn("About information not found for update", { id });
        throw {
          success: false,
          message: "Không tìm thấy thông tin giới thiệu để cập nhật",
          error: "About not found",
        };
      }

      // Validate uploaded files if any
      let mediaData: { logo?: MediaObject[]; banner?: MediaObject[] } = {};
      if (files) {
        const uploadErrors = validateAboutUploads(files);
        if (uploadErrors.length > 0) {
          cleanupAboutTempFiles(
            [...(files.logo || []), ...(files.banner || [])].map((f: any) => f.path)
          );
          throw new Error(`Upload validation failed: ${uploadErrors.join(', ')}`);
        }

        // Process uploads
        mediaData = await processAboutUploads(files);
      }

      // Prepare update data
      const updateData: any = {
        ...(data.schoolName && { schoolName: data.schoolName }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.departmentName !== undefined && { departmentName: data.departmentName }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.fanpage !== undefined && { fanpage: data.fanpage }),
        ...(data.mapEmbedCode !== undefined && { mapEmbedCode: data.mapEmbedCode }),
      };

      // Handle media updates
      if (mediaData.logo) {
        updateData.logo = mediaData.logo;
        logger.info("Logo uploaded successfully", { count: mediaData.logo.length });
      } else if (data.logo) {
        updateData.logo = data.logo;
      }

      if (mediaData.banner) {
        updateData.banner = mediaData.banner;
        logger.info("Banner uploaded successfully", { count: mediaData.banner.length });
      } else if (data.banner) {
        updateData.banner = data.banner;
      }

      // Update the about information
      const updatedAbout = await prisma.about.update({
        where: { id },
        data: updateData,
      });

      logger.info("About information updated successfully", { aboutId: updatedAbout.id });
      return updatedAbout;
    } catch (error: any) {
      if (error.success === false) {
        throw error;
      }
      logger.error("Failed to update about information", { error, id, data });
      throw {
        success: false,
        message: "Không thể cập nhật thông tin giới thiệu",
        error: error,
      };
    }
  }

  /**
   * Delete about information (soft delete)
   */
  static async deleteAbout(id: number) {
    try {
      logger.info("Deleting about information", { id });

      // Check if about exists
      const existingAbout = await prisma.about.findUnique({
        where: { id },
      });

      if (!existingAbout) {
        logger.warn("About information not found for deletion", { id });
        throw {
          success: false,
          message: "Không tìm thấy thông tin giới thiệu để xóa",
          error: "About not found",
        };
      }

      // Soft delete
      const deletedAbout = await prisma.about.update({
        where: { id },
        data: { isActive: false },
      });

      logger.info("About information deleted successfully", { aboutId: deletedAbout.id });
      return deletedAbout;
    } catch (error: any) {
      if (error.success === false) {
        throw error;
      }
      logger.error("Failed to delete about information", { error, id });
      throw {
        success: false,
        message: "Không thể xóa thông tin giới thiệu",
        error: error,
      };
    }
  }

  /**
   * Restore deleted about information
   */
  static async restoreAbout(id: number) {
    try {
      logger.info("Restoring about information", { id });

      // Check if about exists
      const existingAbout = await prisma.about.findUnique({
        where: { id },
      });

      if (!existingAbout) {
        logger.warn("About information not found for restoration", { id });
        throw {
          success: false,
          message: "Không tìm thấy thông tin giới thiệu để khôi phục",
          error: "About not found",
        };
      }

      // Restore
      const restoredAbout = await prisma.about.update({
        where: { id },
        data: { isActive: true },
      });

      logger.info("About information restored successfully", { aboutId: restoredAbout.id });
      return restoredAbout;
    } catch (error: any) {
      if (error.success === false) {
        throw error;
      }
      logger.error("Failed to restore about information", { error, id });
      throw {
        success: false,
        message: "Không thể khôi phục thông tin giới thiệu",
        error: error,
      };
    }
  }

  /**
   * Hard delete about information (permanent deletion)
   */
  static async permanentDeleteAbout(id: number) {
    try {
      logger.info("Permanently deleting about information", { id });

      // Check if about exists
      const existingAbout = await prisma.about.findUnique({
        where: { id },
      });

      if (!existingAbout) {
        logger.warn("About information not found for permanent deletion", { id });
        throw {
          success: false,
          message: "Không tìm thấy thông tin giới thiệu để xóa vĩnh viễn",
          error: "About not found",
        };
      }

      // Delete associated files if exist
      // Note: In JSON format, we might have multiple files, so cleanup should be handled appropriately

      // Hard delete
      const deletedAbout = await prisma.about.delete({
        where: { id },
      });

      logger.info("About information permanently deleted", { aboutId: deletedAbout.id });
      return deletedAbout;
    } catch (error: any) {
      if (error.success === false) {
        throw error;
      }
      logger.error("Failed to permanently delete about information", { error, id });
      throw {
        success: false,
        message: "Không thể xóa vĩnh viễn thông tin giới thiệu",
        error: error,
      };
    }
  }
}

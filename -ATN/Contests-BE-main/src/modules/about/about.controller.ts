import { Request, Response } from "express";
import { CreateAboutInput, UpdateAboutInput, AboutQueryInput } from "./about.schema";
import AboutService from "./about.service";
import { logger } from "@/utils/logger";
import { successResponse, errorResponse, paginatedResponse } from "@/utils/response";
import { handleServiceError, validateId } from "@/utils/errorHandler";

export default class AboutController {

  /**
   * Create new about information
   */
  static async createAbout(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateAboutInput = req.body;
      const files = req.files as any;
      
      const result = await AboutService.createAbout(data, files);

      logger.info("About information created successfully via API", { aboutId: result.id });

      res.status(201).json(successResponse(
        result,
        "Tạo thông tin giới thiệu thành công"
      ));
    } catch (error: any) {
      handleServiceError(
        error,
        res,
        "tạo thông tin giới thiệu",
        { body: req.body }
      );
    }
  }

  /**
   * Get all about information with pagination
   */
  static async getAllAbout(req: Request, res: Response): Promise<void> {
    try {
      const validatedQuery: AboutQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: req.query.search as string || undefined,
        isActive: req.query.isActive !== undefined
          ? req.query.isActive === 'true'
          : undefined
      };

      const { aboutList, pagination } = await AboutService.getAllAbout(validatedQuery);

      logger.info("About information list retrieved successfully via API", {
        count: aboutList.length,
        page: pagination.page
      });

      res.status(200).json(paginatedResponse(
        aboutList,
        pagination,
        "Lấy danh sách thông tin giới thiệu thành công"
      ));
    } catch (error: any) {
      handleServiceError(
        error,
        res,
        "lấy danh sách thông tin giới thiệu",
        { query: req.query }
      );
    }
  }

  /**
   * Get about information by ID
   */
  static async getAboutById(req: Request, res: Response): Promise<void> {
    try {
      const id = validateId(req.params.id);
      const result = await AboutService.getAboutById(id);

      logger.info("About information retrieved successfully via API", { aboutId: id });

      res.status(200).json(successResponse(
        result,
        "Lấy thông tin giới thiệu thành công"
      ));
    } catch (error: any) {
      handleServiceError(
        error,
        res,
        "lấy thông tin giới thiệu",
        { id: req.params.id }
      );
    }
  }

  /**
   * Update about information
   */
  static async updateAbout(req: Request, res: Response): Promise<void> {
    try {
      const id = validateId(req.params.id);
      const data: UpdateAboutInput = req.body;
      const files = req.files as any;

      const result = await AboutService.updateAbout(id, data, files);

      logger.info("About information updated successfully via API", { aboutId: id });

      res.status(200).json(successResponse(
        result,
        "Cập nhật thông tin giới thiệu thành công"
      ));
    } catch (error: any) {
      handleServiceError(
        error,
        res,
        "cập nhật thông tin giới thiệu",
        { id: req.params.id, body: req.body }
      );
    }
  }

  /**
   * Delete about information (soft delete)
   */
  static async deleteAbout(req: Request, res: Response): Promise<void> {
    try {
      const id = validateId(req.params.id);
      const result = await AboutService.deleteAbout(id);

      logger.info("About information deleted successfully via API", { aboutId: id });

      res.status(200).json(successResponse(
        result,
        "Xóa thông tin giới thiệu thành công"
      ));
    } catch (error: any) {
      handleServiceError(
        error,
        res,
        "xóa thông tin giới thiệu",
        { id: req.params.id }
      );
    }
  }

  /**
   * Restore deleted about information
   */
  static async restoreAbout(req: Request, res: Response): Promise<void> {
    try {
      const id = validateId(req.params.id);
      const result = await AboutService.restoreAbout(id);

      logger.info("About information restored successfully via API", { aboutId: id });

      res.status(200).json(successResponse(
        result,
        "Khôi phục thông tin giới thiệu thành công"
      ));
    } catch (error: any) {
      handleServiceError(
        error,
        res,
        "khôi phục thông tin giới thiệu",
        { id: req.params.id }
      );
    }
  }

  /**
   * Permanently delete about information
   */
  static async permanentDeleteAbout(req: Request, res: Response): Promise<void> {
    try {
      const id = validateId(req.params.id);
      const result = await AboutService.permanentDeleteAbout(id);

      logger.info("About information permanently deleted via API", { aboutId: id });

      res.status(200).json(successResponse(
        result,
        "Xóa vĩnh viễn thông tin giới thiệu thành công"
      ));
    } catch (error: any) {
      handleServiceError(
        error,
        res,
        "xóa vĩnh viễn thông tin giới thiệu",
        { id: req.params.id }
      );
    }
  }
}

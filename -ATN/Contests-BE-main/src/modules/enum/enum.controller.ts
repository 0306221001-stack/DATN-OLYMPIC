import { Request, Response } from "express";
import { successResponse, errorResponse } from "@/utils/response";
import { logger } from "@/utils/logger";
import { ERROR_CODES } from "@/constants/errorCodes";
import EnumService from "./enum.service";

export default class EnumController {
  /**
   * Get all enums
   */
  static async getAllEnums(req: Request, res: Response): Promise<void> {
    try {
      const enums = await EnumService.getAllEnums();

      logger.info("Retrieved all enums successfully");

      res.status(200).json(
        successResponse(enums, "Lấy danh sách enum thành công")
      );
    } catch (error) {
      logger.error("Error getting all enums:", error);
      
      res.status(500).json(
        errorResponse(
          "Lỗi server khi lấy danh sách enum",
          ERROR_CODES.INTERNAL_SERVER_ERROR
        )
      );
    }
  }

  /**
   * Get specific enum by name
   */
  static async getEnumByName(req: Request, res: Response): Promise<void> {
    try {
      const { enumName } = req.params;

      const enumData = await EnumService.getEnumByName(enumName);

      if (!enumData) {
        res.status(404).json(
          errorResponse(
            `Không tìm thấy enum: ${enumName}`,
            ERROR_CODES.RECORD_NOT_FOUND
          )
        );
        return;
      }

      logger.info(`Retrieved enum ${enumName} successfully`);

      res.status(200).json(
        successResponse(enumData, `Lấy enum ${enumName} thành công`)
      );
    } catch (error) {
      logger.error("Error getting enum by name:", error);
      
      res.status(500).json(
        errorResponse(
          "Lỗi server khi lấy enum",
          ERROR_CODES.INTERNAL_SERVER_ERROR
        )
      );
    }
  }

  /**
   * Get enum values as array
   */
  static async getEnumValues(req: Request, res: Response): Promise<void> {
    try {
      const { enumName } = req.params;

      const enumValues = await EnumService.getEnumValues(enumName);

      if (!enumValues) {
        res.status(404).json(
          errorResponse(
            `Không tìm thấy enum: ${enumName}`,
            ERROR_CODES.RECORD_NOT_FOUND
          )
        );
        return;
      }

      logger.info(`Retrieved enum values for ${enumName} successfully`);

      res.status(200).json(
        successResponse(enumValues, `Lấy giá trị enum ${enumName} thành công`)
      );
    } catch (error) {
      logger.error("Error getting enum values:", error);
      
      res.status(500).json(
        errorResponse(
          "Lỗi server khi lấy giá trị enum",
          ERROR_CODES.INTERNAL_SERVER_ERROR
        )
      );
    }
  }

  /**
   * Get enum options for dropdowns
   */
  static async getEnumOptions(req: Request, res: Response): Promise<void> {
    try {
      const { enumName } = req.params;

      const enumOptions = await EnumService.getEnumOptions(enumName);

      if (!enumOptions) {
        res.status(404).json(
          errorResponse(
            `Không tìm thấy enum: ${enumName}`,
            ERROR_CODES.RECORD_NOT_FOUND
          )
        );
        return;
      }

      logger.info(`Retrieved enum options for ${enumName} successfully`);

      res.status(200).json(
        successResponse(enumOptions, `Lấy tùy chọn enum ${enumName} thành công`)
      );
    } catch (error) {
      logger.error("Error getting enum options:", error);
      
      res.status(500).json(
        errorResponse(
          "Lỗi server khi lấy tùy chọn enum",
          ERROR_CODES.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
}
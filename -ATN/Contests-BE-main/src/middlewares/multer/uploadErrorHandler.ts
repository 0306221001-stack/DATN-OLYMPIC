import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { logger } from "@/utils/logger";

/**
 * Middleware to handle multer upload errors
 */
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error instanceof multer.MulterError) {
    logger.error("Multer upload error", { error: error.message, code: error.code });
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        res.status(400).json({
          success: false,
          message: "File quá lớn. Kích thước tối đa cho phép là 5MB",
          error: "FILE_TOO_LARGE"
        });
        return;
      case 'LIMIT_FILE_COUNT':
        res.status(400).json({
          success: false,
          message: "Quá nhiều file được upload",
          error: "TOO_MANY_FILES"
        });
        return;
      case 'LIMIT_UNEXPECTED_FILE':
        res.status(400).json({
          success: false,
          message: "Field upload không hợp lệ",
          error: "INVALID_FIELD"
        });
        return;
      default:
        res.status(400).json({
          success: false,
          message: "Lỗi upload file",
          error: error.message
        });
        return;
    }
  }
  
  if (error && error.message) {
    logger.error("File upload error", { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message,
      error: "UPLOAD_ERROR"
    });
    return;
  }
  
  next(error);
};

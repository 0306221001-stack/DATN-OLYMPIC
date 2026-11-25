import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { CONFIG } from "@/config/environment";
import { logger } from "@/utils/logger";

// Interface cho cấu hình upload
export interface UploadConfig {
  uploadDir: string; // Thư mục con trong uploads (vd: "about", "user", "contest")
  filePrefix?: string; // Prefix cho tên file (vd: "about", "user", "avatar")
  maxFileSize?: number; // Kích thước file tối đa (byte)
  allowedTypes?: RegExp; // Regex cho các loại file được phép
  allowedMimeTypes?: RegExp; // Regex cho mime types được phép
}

// Cấu hình mặc định
const DEFAULT_CONFIG: Required<UploadConfig> = {
  uploadDir: "general",
  filePrefix: "img",
  maxFileSize: CONFIG.MAX_FILE_SIZE, // 5MB từ environment
  allowedTypes: /jpeg|jpg|png|gif|webp|svg/,
  allowedMimeTypes: /^image\/(jpeg|jpg|png|gif|webp|svg\+xml)$/,
};

// Các cấu hình có sẵn cho từng module
export const UPLOAD_CONFIGS = {
  ABOUT: {
    uploadDir: "about",
    filePrefix: "about",
    maxFileSize: CONFIG.MAX_FILE_SIZE,
    allowedTypes: /jpeg|jpg|png|gif|webp/,
    allowedMimeTypes: /^image\/(jpeg|jpg|png|gif|webp)$/,
  } as UploadConfig,
  
  USER_AVATAR: {
    uploadDir: "users/avatars",
    filePrefix: "avatar",
    maxFileSize: 2 * 1024 * 1024, // 2MB cho avatar
    allowedTypes: /jpeg|jpg|png|webp/,
    allowedMimeTypes: /^image\/(jpeg|jpg|png|webp)$/,
  } as UploadConfig,
  
  CONTEST: {
    uploadDir: "contests",
    filePrefix: "contest",
    maxFileSize: CONFIG.MAX_FILE_SIZE,
    allowedTypes: /jpeg|jpg|png|gif|webp/,
    allowedMimeTypes: /^image\/(jpeg|jpg|png|gif|webp)$/,
  } as UploadConfig,
  
  SCHOOL: {
    uploadDir: "schools",
    filePrefix: "school",
    maxFileSize: CONFIG.MAX_FILE_SIZE,
    allowedTypes: /jpeg|jpg|png|gif|webp/,
    allowedMimeTypes: /^image\/(jpeg|jpg|png|gif|webp)$/,
  } as UploadConfig,
  
  SPONSOR: {
    uploadDir: "sponsors",
    filePrefix: "sponsor",
    maxFileSize: CONFIG.MAX_FILE_SIZE,
    allowedTypes: /jpeg|jpg|png|gif|webp|svg/,
    allowedMimeTypes: /^image\/(jpeg|jpg|png|gif|webp|svg\+xml)$/,
  } as UploadConfig,
} as const;

// Utility: Tạo thư mục upload nếu chưa tồn tại
const createUploadDir = (uploadPath: string): void => {
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    logger.info(`Created upload directory: ${uploadPath}`);
  }
};

// Utility: Tạo storage với cấu hình tùy chỉnh
const createStorage = (config: UploadConfig): multer.StorageEngine => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb) => {
      const uploadPath = path.join(CONFIG.UPLOAD_DIR, finalConfig.uploadDir);
      createUploadDir(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
      // Tạo tên file unique với timestamp và random number
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileName = `${finalConfig.filePrefix}-${uniqueSuffix}${fileExtension}`;
      cb(null, fileName);
    }
  });
};

// Utility: Tạo file filter với cấu hình tùy chỉnh
const createFileFilter = (config: UploadConfig): multer.Options["fileFilter"] => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Kiểm tra extension
    const extname = finalConfig.allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    
    // Kiểm tra mime type
    const mimetype = finalConfig.allowedMimeTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      const allowedExtensions = finalConfig.allowedTypes.source
        .replace(/[|()]/g, ", ")
        .replace(/\\/g, "");
      cb(new Error(`Chỉ chấp nhận file ảnh (${allowedExtensions})`));
    }
  };
};

// Factory function: Tạo multer instance với cấu hình tùy chỉnh
export const createImageUploader = (config: UploadConfig) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return multer({
    storage: createStorage(finalConfig),
    limits: {
      fileSize: finalConfig.maxFileSize,
    },
    fileFilter: createFileFilter(finalConfig),
  });
};

// Middlewares sẵn có cho từng loại upload

// Single file uploads
export const uploadSingleImage = (config: UploadConfig, fieldName: string = "image") => {
  return createImageUploader(config).single(fieldName);
};

// Multiple files uploads  
export const uploadMultipleImages = (config: UploadConfig, fieldName: string = "images", maxCount: number = 5) => {
  return createImageUploader(config).array(fieldName, maxCount);
};

// Fields uploads (multiple fields, each can have multiple files)
export const uploadImageFields = (config: UploadConfig, fields: { name: string; maxCount: number }[]) => {
  return createImageUploader(config).fields(fields);
};

// Specific middlewares cho từng module
export const aboutImageUpload = {
  single: (fieldName: string) => uploadSingleImage(UPLOAD_CONFIGS.ABOUT, fieldName),
  multiple: (fieldName: string, maxCount?: number) => uploadMultipleImages(UPLOAD_CONFIGS.ABOUT, fieldName, maxCount),
  fields: (fields: { name: string; maxCount: number }[]) => uploadImageFields(UPLOAD_CONFIGS.ABOUT, fields),
};

export const userAvatarUpload = {
  single: (fieldName: string = "avatar") => uploadSingleImage(UPLOAD_CONFIGS.USER_AVATAR, fieldName),
};

export const contestImageUpload = {
  single: (fieldName: string) => uploadSingleImage(UPLOAD_CONFIGS.CONTEST, fieldName),
  multiple: (fieldName: string, maxCount?: number) => uploadMultipleImages(UPLOAD_CONFIGS.CONTEST, fieldName, maxCount),
  fields: (fields: { name: string; maxCount: number }[]) => uploadImageFields(UPLOAD_CONFIGS.CONTEST, fields),
};

export const schoolImageUpload = {
  single: (fieldName: string) => uploadSingleImage(UPLOAD_CONFIGS.SCHOOL, fieldName),
  multiple: (fieldName: string, maxCount?: number) => uploadMultipleImages(UPLOAD_CONFIGS.SCHOOL, fieldName, maxCount),
  fields: (fields: { name: string; maxCount: number }[]) => uploadImageFields(UPLOAD_CONFIGS.SCHOOL, fields),
};

export const sponsorImageUpload = {
  single: (fieldName: string) => uploadSingleImage(UPLOAD_CONFIGS.SPONSOR, fieldName),
  multiple: (fieldName: string, maxCount?: number) => uploadMultipleImages(UPLOAD_CONFIGS.SPONSOR, fieldName, maxCount),
  fields: (fields: { name: string; maxCount: number }[]) => uploadImageFields(UPLOAD_CONFIGS.SPONSOR, fields),
};

// Utility functions for file management

/**
 * Xóa file cũ
 */
export const deleteFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted file: ${filePath}`);
    }
  } catch (error) {
    logger.error("Error deleting file:", { filePath, error });
  }
};

/**
 * Xóa nhiều files
 */
export const deleteFiles = (filePaths: string[]): void => {
  filePaths.forEach(filePath => deleteFile(filePath));
};

/**
 * Tạo URL đầy đủ cho file
 */
export const getFileUrl = (uploadDir: string, fileName: string): string => {
  return `/uploads/${uploadDir}/${fileName}`;
};

/**
 * Lấy đường dẫn file đầy đủ từ server
 */
export const getFilePath = (uploadDir: string, fileName: string): string => {
  return path.join(CONFIG.UPLOAD_DIR, uploadDir, fileName);
};

/**
 * Lấy tên file từ URL
 */
export const getFileNameFromUrl = (fileUrl: string): string | null => {
  if (!fileUrl) return null;
  
  const urlParts = fileUrl.split('/');
  return urlParts[urlParts.length - 1] || null;
};

/**
 * Kiểm tra file có tồn tại không
 */
export const fileExists = (filePath: string): boolean => {
  return fs.existsSync(filePath);
};

/**
 * Lấy thông tin file
 */
export const getFileInfo = (filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  } catch (error) {
    logger.error("Error getting file info:", { filePath, error });
    return null;
  }
};

// Export các hằng số và utility
export { DEFAULT_CONFIG };

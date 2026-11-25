import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { logger } from "@/utils/logger";
import { UploadConfig, createImageUploader, UPLOAD_CONFIGS } from "@/middlewares/imageUpload";
import { MediaType } from "./question.schema";

// Extended upload config for Questions with media support
interface QuestionMediaConfig extends UploadConfig {
  allowedVideoTypes?: RegExp;
  allowedAudioTypes?: RegExp;
  allowedVideoMimeTypes?: RegExp;
  allowedAudioMimeTypes?: RegExp;
  maxVideoSize?: number;
  maxAudioSize?: number;
}

// Question media configuration
export const QUESTION_MEDIA_CONFIG: QuestionMediaConfig = {
  uploadDir: "questions",
  filePrefix: "question",
  maxFileSize: 30 * 1024 * 1024, // 30MB for images
  maxVideoSize: 100 * 1024 * 1024, // 100MB for videos  
  maxAudioSize: 50 * 1024 * 1024, // 50MB for audio
  allowedTypes: /jpeg|jpg|png|gif|webp|svg/,
  allowedMimeTypes: /^image\/(jpeg|jpg|png|gif|webp|svg\+xml)$/,
  allowedVideoTypes: /mp4|avi|mov|wmv|flv|webm|mkv/,
  allowedVideoMimeTypes: /^video\/(mp4|avi|quicktime|x-ms-wmv|x-flv|webm|x-matroska)$/,
  allowedAudioTypes: /mp3|wav|ogg|aac|flac|m4a/,
  allowedAudioMimeTypes: /^audio\/(mpeg|wav|ogg|aac|flac|mp4)$/,
};

// Temporary upload directory for processing
export const TMP_UPLOAD_DIR = path.join(process.cwd(), "tmp");

// Create temp directory if not exists
const createTempDir = (): void => {
  if (!fs.existsSync(TMP_UPLOAD_DIR)) {
    fs.mkdirSync(TMP_UPLOAD_DIR, { recursive: true });
    logger.info(`Created temp directory: ${TMP_UPLOAD_DIR}`);
  }
};

// Detect media type from file extension
export const detectMediaType = (filename: string): MediaType => {
  const ext = path.extname(filename).toLowerCase().substring(1);
  
  if (QUESTION_MEDIA_CONFIG.allowedTypes?.test(ext)) {
    return MediaType.IMAGE;
  }
  
  if (QUESTION_MEDIA_CONFIG.allowedVideoTypes?.test(ext)) {
    return MediaType.VIDEO;
  }
  
  if (QUESTION_MEDIA_CONFIG.allowedAudioTypes?.test(ext)) {
    return MediaType.AUDIO;
  }
  
  throw new Error(`Unsupported file type: ${ext}`);
};

// Detect media type from MIME type
export const detectMediaTypeFromMime = (mimeType: string): MediaType => {
  if (QUESTION_MEDIA_CONFIG.allowedMimeTypes?.test(mimeType)) {
    return MediaType.IMAGE;
  }
  
  if (QUESTION_MEDIA_CONFIG.allowedVideoMimeTypes?.test(mimeType)) {
    return MediaType.VIDEO;
  }
  
  if (QUESTION_MEDIA_CONFIG.allowedAudioMimeTypes?.test(mimeType)) {
    return MediaType.AUDIO;
  }
  
  throw new Error(`Unsupported MIME type: ${mimeType}`);
};

// Get max file size based on media type
export const getMaxFileSize = (mediaType: MediaType): number => {
  switch (mediaType) {
    case MediaType.IMAGE:
      return QUESTION_MEDIA_CONFIG.maxFileSize!;
    case MediaType.VIDEO:
      return QUESTION_MEDIA_CONFIG.maxVideoSize!;
    case MediaType.AUDIO:
      return QUESTION_MEDIA_CONFIG.maxAudioSize!;
    default:
      return QUESTION_MEDIA_CONFIG.maxFileSize!;
  }
};

// Custom storage for question media (temporary upload first)
export const createQuestionMediaStorage = (): multer.StorageEngine => {
  return multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb) => {
      createTempDir();
      cb(null, TMP_UPLOAD_DIR);
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
      try {
        const mediaType = detectMediaTypeFromMime(file.mimetype);
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `${QUESTION_MEDIA_CONFIG.filePrefix}-${mediaType}-${uniqueSuffix}${ext}`;
        cb(null, filename);
      } catch (error) {
        cb(error as Error, "");
      }
    }
  });
};

// Custom file filter for question media
export const createQuestionMediaFilter = (): multer.Options["fileFilter"] => {
  return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    try {
      const mediaType = detectMediaTypeFromMime(file.mimetype);
      
      logger.info(`Uploading ${mediaType} file: ${file.originalname}, MIME: ${file.mimetype}`);
      cb(null, true);
    } catch (error) {
      logger.error(`File filter error: ${error}`);
      cb(new Error(`Unsupported file type: ${file.mimetype}`) as any, false);
    }
  };
};

// Validate file sizes after upload
export const validateFileSizes = (files: Express.Multer.File[]): void => {
  for (const file of files) {
    try {
      const mediaType = detectMediaTypeFromMime(file.mimetype);
      const maxSize = getMaxFileSize(mediaType);
      
      if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        const fileSizeMB = Math.round(file.size / (1024 * 1024) * 10) / 10;
        
        throw new Error(
          `File "${file.originalname}" (${fileSizeMB}MB) exceeds maximum size for ${mediaType} files (${maxSizeMB}MB)`
        );
      }
      
      logger.info(`File size validation passed: ${file.originalname} (${Math.round(file.size / (1024 * 1024) * 10) / 10}MB)`);
    } catch (error) {
      logger.error(`File size validation failed: ${error}`);
      throw error;
    }
  }
};

// Create question media uploader
export const createQuestionMediaUploader = () => {
  return multer({
    storage: createQuestionMediaStorage(),
    fileFilter: createQuestionMediaFilter(),
    limits: {
      fileSize: QUESTION_MEDIA_CONFIG.maxVideoSize, // Use max size (video) as upper limit
      files: 10 // Max 10 files per upload
    }
  });
};

// Middleware for uploading question media
export const questionMediaUpload = {
  single: (fieldName: string = "media") => 
    createQuestionMediaUploader().single(fieldName),
  
  multiple: (fieldName: string = "media", maxCount: number = 5) => 
    createQuestionMediaUploader().array(fieldName, maxCount),
  
  fields: (fields: { name: string; maxCount: number }[]) => 
    createQuestionMediaUploader().fields(fields)
};

// Move file from temp to permanent location
export const moveFileFromTemp = async (tempPath: string, permanentPath: string): Promise<void> => {
  try {
    // Kiểm tra file tạm có tồn tại không
    try {
      await fs.promises.access(tempPath, fs.constants.F_OK);
    } catch (error) {
      logger.error(`Temp file does not exist: ${tempPath}`);
      throw new Error(`File tạm không tồn tại: ${tempPath}`);
    }

    // Đảm bảo thư mục đích tồn tại
    const permanentDir = path.dirname(permanentPath);
    await fs.promises.mkdir(permanentDir, { recursive: true });
    
    // Đọc file tạm
    const fileContent = await fs.promises.readFile(tempPath);
    
    // Ghi file vào thư mục đích
    await fs.promises.writeFile(permanentPath, fileContent);
    
    // Xóa file tạm sau khi copy thành công
    await fs.promises.unlink(tempPath);
    
    logger.info(`File moved successfully from ${tempPath} to ${permanentPath}`);
  } catch (error) {
    logger.error(`Error moving file from ${tempPath} to ${permanentPath}:`, error);
    throw error;
  }
};

// Clean up temp files
export const cleanupTempFiles = (filePaths: string[]): void => {
  filePaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up temp file: ${filePath}`);
      } catch (error) {
        logger.error(`Error cleaning up temp file ${filePath}:`, error);
      }
    }
  });
};

// Get permanent file path for question media
export const getQuestionMediaPath = (filename: string): string => {
  return path.join(process.cwd(), "uploads", "questions", filename);
};

// Get question media URL
export const getQuestionMediaUrl = (filename: string): string => {
  return `/uploads/questions/${filename}`;
};

// Validate uploaded file size against media type limits
export const validateFileSize = (file: Express.Multer.File): void => {
  const mediaType = detectMediaTypeFromMime(file.mimetype);
  const maxSize = getMaxFileSize(mediaType);
  
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    throw new Error(`File quá lớn. Kích thước tối đa cho ${mediaType} là ${maxSizeMB}MB`);
  }
};

// Get media file dimensions (for images and videos)
export const getMediaDimensions = async (filePath: string, mediaType: MediaType): Promise<{ width: number; height: number } | null> => {
  // This would require additional packages like sharp (for images) or ffprobe (for videos)
  // For now, return null - can be implemented later
  return null;
};

// Get media duration (for videos and audio)
export const getMediaDuration = async (filePath: string, mediaType: MediaType): Promise<number | null> => {
  // This would require ffprobe or similar tool
  // For now, return null - can be implemented later
  return null;
};

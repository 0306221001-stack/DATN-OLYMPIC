import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { logger } from "@/utils/logger";
import { UploadConfig } from "@/middlewares/imageUpload";

// Media type enum for About
export enum AboutMediaType {
  IMAGE = "image",
  VIDEO = "video"
}

// Extended upload config for About with media support
interface AboutMediaConfig extends UploadConfig {
  allowedVideoTypes?: RegExp;
  allowedVideoMimeTypes?: RegExp;
  maxVideoSize?: number;
}

// About media configuration
export const ABOUT_MEDIA_CONFIG: AboutMediaConfig = {
  uploadDir: "about",
  filePrefix: "about",
  maxFileSize: 5 * 1024 * 1024, // 5MB for images
  maxVideoSize: 100 * 1024 * 1024, // 100MB for videos
  allowedTypes: /jpeg|jpg|png|gif|webp|svg/,
  allowedMimeTypes: /^image\/(jpeg|jpg|png|gif|webp|svg\+xml)$/,
  allowedVideoTypes: /mp4|avi|mov|wmv|flv|webm|mkv/,
  allowedVideoMimeTypes: /^video\/(mp4|avi|quicktime|x-ms-wmv|x-flv|webm|x-matroska)$/,
};

// Temporary upload directory for processing
export const TMP_UPLOAD_DIR = path.join(process.cwd(), "tmp", "about");

// Create temp directory if not exists
const createTempDir = (): void => {
  if (!fs.existsSync(TMP_UPLOAD_DIR)) {
    fs.mkdirSync(TMP_UPLOAD_DIR, { recursive: true });
    logger.info(`Created temp directory: ${TMP_UPLOAD_DIR}`);
  }
};

// Detect media type from file extension
export const detectAboutMediaType = (filename: string): AboutMediaType => {
  const ext = path.extname(filename).toLowerCase().substring(1);
  
  if (ABOUT_MEDIA_CONFIG.allowedTypes?.test(ext)) {
    return AboutMediaType.IMAGE;
  }
  
  if (ABOUT_MEDIA_CONFIG.allowedVideoTypes?.test(ext)) {
    return AboutMediaType.VIDEO;
  }
  
  throw new Error(`Unsupported file type: ${ext}`);
};

// Detect media type from MIME type
export const detectAboutMediaTypeFromMime = (mimeType: string): AboutMediaType => {
  if (ABOUT_MEDIA_CONFIG.allowedMimeTypes?.test(mimeType)) {
    return AboutMediaType.IMAGE;
  }
  
  if (ABOUT_MEDIA_CONFIG.allowedVideoMimeTypes?.test(mimeType)) {
    return AboutMediaType.VIDEO;
  }
  
  throw new Error(`Unsupported MIME type: ${mimeType}`);
};

// Get max file size based on media type
export const getAboutMaxFileSize = (mediaType: AboutMediaType): number => {
  switch (mediaType) {
    case AboutMediaType.IMAGE:
      return ABOUT_MEDIA_CONFIG.maxFileSize!;
    case AboutMediaType.VIDEO:
      return ABOUT_MEDIA_CONFIG.maxVideoSize!;
    default:
      return ABOUT_MEDIA_CONFIG.maxFileSize!;
  }
};

// Custom storage for about media (temporary upload first)
export const createAboutMediaStorage = (): multer.StorageEngine => {
  return multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb) => {
      createTempDir();
      cb(null, TMP_UPLOAD_DIR);
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
      try {
        const mediaType = detectAboutMediaType(file.originalname);
        const ext = path.extname(file.originalname);
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000000);
        
        let filename: string;
        if (file.fieldname === 'logo') {
          filename = `about-logo-${timestamp}-${random}${ext}`;
        } else if (file.fieldname === 'banner') {
          filename = `about-banner-${timestamp}-${random}${ext}`;
        } else {
          filename = `about-${mediaType}-${timestamp}-${random}${ext}`;
        }
        
        cb(null, filename);
      } catch (error) {
        cb(error as Error, '');
      }
    }
  });
};

// Custom file filter for about media
export const createAboutMediaFilter = (): multer.Options["fileFilter"] => {
  return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    try {
      const mediaType = detectAboutMediaTypeFromMime(file.mimetype);
      const maxSize = getAboutMaxFileSize(mediaType);
      
      // Validate file type
      if (mediaType === AboutMediaType.IMAGE) {
        if (!ABOUT_MEDIA_CONFIG.allowedMimeTypes?.test(file.mimetype)) {
          cb(null, false);
          return;
        }
      } else if (mediaType === AboutMediaType.VIDEO) {
        if (!ABOUT_MEDIA_CONFIG.allowedVideoMimeTypes?.test(file.mimetype)) {
          cb(null, false);
          return;
        }
      }
      
      cb(null, true);
    } catch (error) {
      cb(null, false);
    }
  };
};

// Create about media uploader
export const createAboutMediaUploader = () => {
  return multer({
    storage: createAboutMediaStorage(),
    fileFilter: createAboutMediaFilter(),
    limits: {
      fileSize: ABOUT_MEDIA_CONFIG.maxVideoSize, // Use max video size as upper limit
      files: 10 // Max 10 files total
    }
  });
};

// Middleware for uploading about media
export const aboutMediaUpload = createAboutMediaUploader().fields([
  { name: 'logo', maxCount: 5 }, // Multiple logos
  { name: 'banner', maxCount: 5 } // Multiple banners
]);

// Move file from temp to permanent location
export const moveAboutFileFromTemp = (tempPath: string, filename: string, fieldType: 'logo' | 'banner'): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create permanent directory
      const permanentDir = path.join(process.cwd(), "uploads", "about", fieldType);
      if (!fs.existsSync(permanentDir)) {
        fs.mkdirSync(permanentDir, { recursive: true });
      }
      
      const permanentPath = path.join(permanentDir, filename);
      
      // Move file
      fs.rename(tempPath, permanentPath, (err) => {
        if (err) {
          logger.error(`Failed to move file from ${tempPath} to ${permanentPath}:`, err);
          reject(err);
        } else {
          logger.info(`File moved successfully from ${tempPath} to ${permanentPath}`);
          resolve(permanentPath);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Clean up temp files
export const cleanupAboutTempFiles = (filePaths: string[]): void => {
  filePaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up temp file: ${filePath}`);
      } catch (error) {
        logger.error(`Failed to clean up temp file: ${filePath}`, error);
      }
    }
  });
};

// Get permanent file path for about media
export const getAboutMediaPath = (filename: string, fieldType: 'logo' | 'banner'): string => {
  return path.join(process.cwd(), "uploads", "about", fieldType, filename);
};

// Get about media URL
export const getAboutMediaUrl = (filename: string, fieldType: 'logo' | 'banner'): string => {
  return `/uploads/about/${fieldType}/${filename}`;
};

// Validate uploaded file size against media type limits
export const validateAboutFileSize = (file: Express.Multer.File): void => {
  const mediaType = detectAboutMediaTypeFromMime(file.mimetype);
  const maxSize = getAboutMaxFileSize(mediaType);
  
  if (file.size > maxSize) {
    throw new Error(`File size ${file.size} exceeds limit ${maxSize} for ${mediaType}`);
  }
};

// Process uploaded files and create media objects
export const processAboutUploads = async (files: any): Promise<{
  logo?: any[];
  banner?: any[];
}> => {
  const result: {
    logo?: any[];
    banner?: any[];
  } = {};

  if (files) {
    // Process logo files
    if (files.logo && files.logo.length > 0) {
      result.logo = await Promise.all(
        files.logo.map(async (file: Express.Multer.File) => {
          const mediaType = detectAboutMediaTypeFromMime(file.mimetype);
          const permanentPath = await moveAboutFileFromTemp(file.path, file.filename, 'logo');
          
          return {
            url: getAboutMediaUrl(file.filename, 'logo'),
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            type: mediaType,
            description: `Logo file: ${file.originalname}`
          };
        })
      );
    }

    // Process banner files
    if (files.banner && files.banner.length > 0) {
      result.banner = await Promise.all(
        files.banner.map(async (file: Express.Multer.File) => {
          const mediaType = detectAboutMediaTypeFromMime(file.mimetype);
          const permanentPath = await moveAboutFileFromTemp(file.path, file.filename, 'banner');
          
          return {
            url: getAboutMediaUrl(file.filename, 'banner'),
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            type: mediaType,
            description: `Banner file: ${file.originalname}`
          };
        })
      );
    }
  }

  return result;
};

// Validate about media uploads
export const validateAboutUploads = (files: any): string[] => {
  const errors: string[] = [];

  if (files) {
    const allFiles = [
      ...(files.logo || []),
      ...(files.banner || [])
    ];

    // Check individual file validation
    allFiles.forEach((file: Express.Multer.File) => {
      try {
        validateAboutFileSize(file);
      } catch (error) {
        errors.push(`${file.originalname}: ${(error as Error).message}`);
      }
    });

    // Check file count limits
    if (files.logo && files.logo.length > 5) {
      errors.push("Maximum 5 logo files allowed");
    }

    if (files.banner && files.banner.length > 5) {
      errors.push("Maximum 5 banner files allowed");
    }
  }

  return errors;
};

import { Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { logger } from "@/utils/logger";
import { createImageUploader, UPLOAD_CONFIGS, getFileUrl, UploadConfig } from "@/middlewares/imageUpload";
import { CONFIG } from "@/config/environment";

// Tạo config riêng cho sponsor với hỗ trợ cả ảnh và video
const SPONSOR_MULTIMEDIA_CONFIG: UploadConfig = {
  uploadDir: "sponsors",
  filePrefix: "sponsor",
  maxFileSize: 50 * 1024 * 1024, // 50MB cho video
  allowedTypes: /jpeg|jpg|png|gif|webp|svg|mp4|avi|mov|wmv|webm/,
  allowedMimeTypes: /^(image\/(jpeg|jpg|png|gif|webp|svg\+xml)|video\/(mp4|avi|quicktime|x-ms-wmv|webm))$/,
};

// Tạo storage cho multimedia
const multimediaStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const uploadPath = path.join(CONFIG.UPLOAD_DIR, SPONSOR_MULTIMEDIA_CONFIG.uploadDir);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      logger.info(`Created upload directory: ${uploadPath}`);
    }
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const fileName = `${SPONSOR_MULTIMEDIA_CONFIG.filePrefix}-${uniqueSuffix}${fileExtension}`;
    cb(null, fileName);
  }
});

// File filter cho multimedia
const multimediaFileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  const isValidType = SPONSOR_MULTIMEDIA_CONFIG.allowedTypes!.test(path.extname(file.originalname).toLowerCase().slice(1));
  const isValidMimeType = SPONSOR_MULTIMEDIA_CONFIG.allowedMimeTypes!.test(file.mimetype);
  
  if (isValidType && isValidMimeType) {
    cb(null, true);
  } else {
    const isImage = /^image\//.test(file.mimetype);
    const isVideo = /^video\//.test(file.mimetype);
    
    if (!isImage && !isVideo) {
      cb(new Error("Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp, svg) hoặc video (mp4, avi, mov, wmv, webm)"));
    } else if (isImage && !SPONSOR_MULTIMEDIA_CONFIG.allowedMimeTypes!.test(file.mimetype)) {
      cb(new Error("Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp, svg)"));
    } else if (isVideo && !SPONSOR_MULTIMEDIA_CONFIG.allowedMimeTypes!.test(file.mimetype)) {
      cb(new Error("Chỉ chấp nhận file video (mp4, avi, mov, wmv, webm)"));
    } else {
      cb(new Error("Định dạng file không được hỗ trợ"));
    }
  }
};

// Tạo uploader cho multimedia
const sponsorMultimediaUpload = multer({
  storage: multimediaStorage,
  limits: {
    fileSize: SPONSOR_MULTIMEDIA_CONFIG.maxFileSize,
  },
  fileFilter: multimediaFileFilter,
});

// Sponsor uploader sử dụng config multimedia mới
export const sponsorImageUpload = sponsorMultimediaUpload;

// Export middleware upload đơn giản
export const sponsorUploadMiddleware = {
  fields: () => sponsorImageUpload.fields([
    { name: "logo", maxCount: 1 },
    { name: "images", maxCount: 1 },
    { name: "videos", maxCount: 1 }
  ])
};

// Process uploaded files và convert thành string URLs đơn giản
export const processSponsorFiles = (files: any): { logo?: string, images?: string, videos?: string } => {
  const result: { logo?: string, images?: string, videos?: string } = {};

  // Logo - 1 file -> 1 string URL
  if (files.logo && files.logo[0]) {
    result.logo = getFileUrl(UPLOAD_CONFIGS.SPONSOR.uploadDir, files.logo[0].filename);
  }

  // Images - 1 file -> 1 string URL  
  if (files.images && files.images[0]) {
    result.images = getFileUrl(UPLOAD_CONFIGS.SPONSOR.uploadDir, files.images[0].filename);
  }

  // Videos - 1 file -> 1 string URL
  if (files.videos && files.videos[0]) {
    result.videos = getFileUrl(UPLOAD_CONFIGS.SPONSOR.uploadDir, files.videos[0].filename);
  }

  return result;
};

// Cleanup files on error
export const cleanupUploadedFiles = (files: any): void => {
  try {
    const allFiles = [
      ...(files.logo || []),
      ...(files.images || []),
      ...(files.videos || [])
    ];

    for (const file of allFiles) {
      if (file.path) {
        const fs = require('fs');
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          logger.info(`Cleaned up file: ${file.path}`);
        }
      }
    }
  } catch (error) {
    logger.error("Error cleaning up files:", error);
  }
};

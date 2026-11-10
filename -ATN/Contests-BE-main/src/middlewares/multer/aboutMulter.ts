import { 
  aboutImageUpload, 
  UPLOAD_CONFIGS, 
  deleteFile, 
  getFileUrl, 
  getFilePath,
  getFileNameFromUrl
} from "@/middlewares/imageUpload";

// Re-export về tương thích với code cũ
export const uploadAboutLogo = aboutImageUpload.single("logo");
export const uploadAboutBanner = aboutImageUpload.single("banner");
export const uploadAboutImages = aboutImageUpload.fields([
  { name: "logo", maxCount: 1 },
  { name: "banner", maxCount: 1 }
]);

// Utility functions tương thích với code cũ
export const deleteOldFile = deleteFile;

export const getAboutFileUrl = (fileName: string): string => {
  return getFileUrl(UPLOAD_CONFIGS.ABOUT.uploadDir, fileName);
};

export const getAboutFilePath = (fileName: string): string => {
  return getFilePath(UPLOAD_CONFIGS.ABOUT.uploadDir, fileName);
};

// Export thêm các utility functions mới
export { getFileNameFromUrl };
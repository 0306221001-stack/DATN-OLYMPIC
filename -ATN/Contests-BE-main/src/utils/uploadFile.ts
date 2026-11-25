import path from "path";
import fs from "fs/promises";

export function prepareFileInfoCustom(
  file: Express.Multer.File,
  folderPath: string // Đường dẫn tuyệt đối tới thư mục lưu file
): {
  isValid: boolean;
  fileName?: string;
  ext?: string;
  originalName?: string;
  tempPath?: string;
  destPath?: string;
  error?: string;
} {
  const ext = path.extname(file.originalname).toLowerCase();
  const baseName = path.basename(file.originalname, ext).replace(/\s+/g, "-");
  const fileName = `${Date.now()}-${baseName}${ext}`;
  const tempPath = file.path;
  const destPath = path.join(folderPath, fileName);

  return {
    isValid: true,
    fileName,
    ext: ext.slice(1),
    originalName: baseName,
    tempPath,
    destPath,
  };
}

export async function moveUploadedFile(tempPath: string, destPath: string) {
  try {
    await fs.copyFile(tempPath, destPath);
    await fs.unlink(tempPath);
  } catch (error) {
    throw error;
  }
}

export const deleteFile = async (relativePath: string | null) => {
  try {
    if (!relativePath) return;
    const cleanedPath = relativePath.replace(/^\/?uploads\/?/, "");
    const fullPath = path.resolve("uploads", cleanedPath);
    await fs.unlink(fullPath);
  } catch (error) {
    console.error("Lỗi khi xóa file:", relativePath, error);
  }
};

export async function deleteTempFile(tempPath: string | null): Promise<void> {
  try {
    if (!tempPath) return;
    await fs.access(tempPath);
    await fs.unlink(tempPath);
    console.log(`Đã xóa file tạm: ${tempPath}`);
  } catch (err) {
    console.warn(`Không thể xóa file tạm (có thể không tồn tại): ${tempPath}`);
  }
}

export async function ensureFolderExists(folderPath: string): Promise<void> {
  try {
    await fs.access(folderPath); // Kiểm tra tồn tại
  } catch (error) {
    // Nếu lỗi nghĩa là không tồn tại => tạo thư mục
    await fs.mkdir(folderPath, { recursive: true });
  }
}

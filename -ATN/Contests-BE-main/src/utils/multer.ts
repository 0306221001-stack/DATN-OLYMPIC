import multer, { StorageEngine } from "multer";
import path from "path";
import fs from "fs";

export function createMulter(subfolder: string): multer.Multer {
  const storage: StorageEngine = multer.diskStorage({
    destination: (req, file, cb): void => {
      const folderPath = path.resolve(process.cwd(), "uploads", subfolder);
      fs.mkdirSync(folderPath, { recursive: true });
      cb(null, folderPath);
    },
    filename: (req, file, cb): void => {
      const sanitized = file.originalname
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w.-]/g, "");

      const uniqueName = `${Date.now()}-${sanitized}`;
      cb(null, uniqueName);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
    },
  });
}

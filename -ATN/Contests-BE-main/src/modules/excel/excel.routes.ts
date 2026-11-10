import { Router } from "express";
const excelRouter = Router();
import multer from "multer";

import { ExcelController } from "@/modules/excel";
import { authenticate, role } from "@/middlewares/auth";

const upload = multer({ storage: multer.memoryStorage() });

excelRouter.post(
  "/export",
  authenticate,
  role("Admin"),
  ExcelController.Export
);

excelRouter.post(
  "/import",
  authenticate,
  role("Admin"),
  upload.single("file"),
  ExcelController.Import
);

export { excelRouter };

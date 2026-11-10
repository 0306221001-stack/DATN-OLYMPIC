import { exportExcel, importExcel } from "@/utils/Excel";
import { Response, Request } from "express";
import { successResponse, errorResponse } from "@/utils/response";
import { logger } from "@/utils/logger";

export default class ExcelController {
  static async Export(req: Request, res: Response) {
    try {
      const { data, fileName } = req.body;
      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu không hợp lệ");
      }
      exportExcel(data, fileName || "data", res);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async Import(req: Request, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        throw new Error("Không có tệp để nhập");
      }
      const columns = importExcel(file);
      const data = columns.map(column => {
        return {
          id: column.A,
          username: column.B,
          password: column.C,
          email: column.D,
          role: column.E,
        };
      });

      res.status(200).json(successResponse(data));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}

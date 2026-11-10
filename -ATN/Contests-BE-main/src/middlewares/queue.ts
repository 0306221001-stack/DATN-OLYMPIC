import queue from "express-queue";
import { Request, Response, NextFunction } from "express";

const requestQueue = queue({
  activeLimit: 1,
  queuedLimit: 20,
  rejectHandler: ((req: Request, res: Response, next: NextFunction) => {
    return res.status(429).json({
      message: "Hệ thống đang quá tải, vui lòng thử lại sau.",
    });
  }) as any,
} as any);

export default requestQueue;

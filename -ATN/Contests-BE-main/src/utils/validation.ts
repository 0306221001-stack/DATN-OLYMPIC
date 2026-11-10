import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { createError } from "@/middlewares/errorHandler";
import { logger } from "@/utils/logger";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedBody = schema.parse(req.body);
      req.body = validatedBody; // Body can usually be assigned safely
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(createError("VALIDATION_ERROR", 400));
      }
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedParams = schema.parse(req.params);
      // Store validated params in a custom property since req.params might be read-only
      (req as any).validatedParams = validatedParams;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(createError("VALIDATION_ERROR", 400));
      }
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedQuery = schema.parse(req.query);
      // Store validated query in a custom property since req.query might be read-only
      (req as any).validatedQuery = validatedQuery;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
      } else {
        next(createError("VALIDATION_ERROR", 400));
      }
    }
  };
};

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { validationErrorResponse } from "@/utils/response";

export interface ValidationOptions {
  skipUnknown?: boolean;
  allowUnknown?: boolean;
}

/**
 * Validate request body
 */
export const validateData = (field: string, message: string) => {
  return {
    success: false,
    message: "Validation failed",
    error: {
      type: "VALIDATION_ERROR",
      details: [
        {
          field: field,
          message: message,
        },
      ],
    },
    timestamp: new Date().toISOString(),
  };
};

export const validateBody = (
  schema: ZodSchema,
  options: ValidationOptions = {}
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedBody = schema.parse(req.body);
      req.body = validatedBody;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
        }));
        res.status(400).json(validationErrorResponse(errors));
        return;
      }
      next(error);
    }
  };
};

/**
 * Validate request query parameters
 */
export const validateQuery = (
  schema: ZodSchema,
  options: ValidationOptions = {}
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedQuery = schema.parse(req.query);
      // Store validated query in a custom property since req.query is read-only
      (req as any).validatedQuery = validatedQuery;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
        }));

        res.status(400).json(validationErrorResponse(errors));
        return;
      }
      next(error);
    }
  };
};

/**
 * Validate request parameters
 */
export const validateParams = (
  schema: ZodSchema,
  options: ValidationOptions = {}
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams = schema.parse(req.params);
      // Store validated params in a custom property since req.params might be read-only
      (req as any).validatedParams = validatedParams;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
        }));

        res.status(400).json(validationErrorResponse(errors));
        return;
      }
      next(error);
    }
  };
};

/**
 * Validate request headers
 */
export const validateHeaders = (
  schema: ZodSchema,
  options: ValidationOptions = {}
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedHeaders = schema.parse(req.headers);
      // Store validated headers in a custom property since req.headers is read-only
      (req as any).validatedHeaders = validatedHeaders;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
        }));

        res.status(400).json(validationErrorResponse(errors));
        return;
      }
      next(error);
    }
  };
};

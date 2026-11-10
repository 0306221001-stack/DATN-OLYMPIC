import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { logger } from '@/utils/logger';
import { ERROR_CODES, ERROR_MESSAGES } from '@/constants/errorCodes';
import { errorResponse, validationErrorResponse } from '@/utils/response';

export interface AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;
  stack?: string;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = ERROR_CODES.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (
  code: keyof typeof ERROR_CODES,
  statusCode: number = 500,
  customMessage?: string
): CustomError => {
  const message = customMessage || ERROR_MESSAGES[ERROR_CODES[code]];
  return new CustomError(message, statusCode, ERROR_CODES[code]);
};

export const errorHandler = (
  err: Error | AppError | ZodError | PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error: AppError = {
    name: 'AppError',
    message: err.message,
    statusCode: 500,
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    isOperational: true,
    ...(err.stack && { stack: err.stack }),
  };
  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    
    logger.warn('Validation Error:', {
      errors,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
    
    res.status(400).json(validationErrorResponse(errors));
    return;
  }
  // Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        error = {
          ...error,
          message: 'Duplicate field value',
          statusCode: 409,
          code: ERROR_CODES.DUPLICATE_ENTRY,
        };
        break;
      case 'P2025':
        error = {
          ...error,
          message: 'Record not found',
          statusCode: 404,
          code: ERROR_CODES.RECORD_NOT_FOUND,
        };
        break;
      default:
        error = {
          ...error,
          message: 'Database error',
          statusCode: 500,
          code: ERROR_CODES.DATABASE_ERROR,
        };
    }
  }

  // Custom app errors
  if ('statusCode' in err && 'code' in err) {
    error = err as AppError;
  }

  // Log errors
  if (error.statusCode >= 500) {
    logger.error('Internal Server Error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } else {
    logger.warn('Client Error:', {
      error: error.message,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
  }
  // Send error response
  res.status(error.statusCode).json(errorResponse(
    process.env.NODE_ENV === 'production' && error.statusCode >= 500
      ? 'Internal server error'
      : error.message,
    {
      code: error.code,
      ...(process.env.NODE_ENV === 'development' && error.stack && {
        stack: error.stack,
      }),
    }
  ));
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json(errorResponse(
    `Route ${req.originalUrl} not found`,
    { code: ERROR_CODES.NOT_FOUND }
  ));
};

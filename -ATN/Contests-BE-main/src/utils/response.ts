export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
  timestamp?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: PaginationMeta;
  timestamp?: string;
}

/**
 * Create a successful API response
 */
export const successResponse = <T>(
  data: T,
  message: string = 'Success'
): ApiResponse<T> => ({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString(),
});

/**
 * Create a successful paginated API response
 */
export const paginatedResponse = <T>(
  data: T[],
  pagination: PaginationMeta,
  message: string = 'Success'
): PaginatedResponse<T> => ({
  success: true,
  message,
  data,
  pagination,
  timestamp: new Date().toISOString(),
});

/**
 * Create an error API response
 */
export const errorResponse = (
  message: string,
  error?: any
): ApiResponse => ({
  success: false,
  message,
  error,
  timestamp: new Date().toISOString(),
});

/**
 * Create a validation error response
 */
export const validationErrorResponse = (
  errors: Array<{ field: string; message: string }>
): ApiResponse => ({
  success: false,
  message: 'Validation failed',
  error: {
    type: 'VALIDATION_ERROR',
    details: errors,
  },
  timestamp: new Date().toISOString(),
});

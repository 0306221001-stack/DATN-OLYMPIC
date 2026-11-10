import { Response } from "express";
import { logger } from "./logger";

/**
 * Handle service errors with proper status codes and logging
 */
export const handleServiceError = (
    error: any,
    res: Response,
    context: string,
    additionalInfo?: any
): void => {
    logger.error(`Failed to ${context}`, { error, ...additionalInfo });

    if (error.success === false) {
        const statusCode = getStatusCodeFromError(error.message);
        res.status(statusCode).json(error);
    } else {
        res.status(500).json({
            success: false,
            message: `Lỗi hệ thống khi ${context}`,
            error: error.message
        });
    }
};

/**
 * Validate and parse ID parameter
 */
export const validateId = (id: string | undefined): number => {
    const parsedId = parseInt(id!);
    if (isNaN(parsedId)) {
        throw {
            success: false,
            message: "ID không hợp lệ",
            error: "Invalid ID format"
        };
    }
    return parsedId;
};

/**
 * Get appropriate status code from error message
 */
const getStatusCodeFromError = (message: string): number => {
    if (message.includes("không tìm thấy") || message.includes("not found")) {
        return 404;
    }
    if (message.includes("không hợp lệ") || message.includes("invalid")) {
        return 400;
    }
    if (message.includes("không có quyền") || message.includes("unauthorized")) {
        return 401;
    }
    if (message.includes("bị cấm") || message.includes("forbidden")) {
        return 403;
    }
    if (message.includes("đã tồn tại") || message.includes("already exists")) {
        return 409;
    }
    return 400;
};
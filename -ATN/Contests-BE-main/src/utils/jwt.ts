import jwt from "jsonwebtoken";
import { CONFIG } from "@/config/environment";
import { createError } from "@/middlewares/errorHandler";

export interface JwtPayload {
  userId: number;
  username: string;
  email: string;
  role: string;
  type: "access" | "refresh";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate JWT access token
 */
export const generateAccessToken = (
  payload: Omit<JwtPayload, "type">
): string => {
  return jwt.sign({ ...payload, type: "access" }, CONFIG.JWT_SECRET, {
    expiresIn: CONFIG.JWT_EXPIRES_IN,
    issuer: "contest-api",
    audience: "contest-app",
  } as jwt.SignOptions);
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (
  payload: Omit<JwtPayload, "type">
): string => {
  return jwt.sign({ ...payload, type: "refresh" }, CONFIG.JWT_SECRET, {
    expiresIn: CONFIG.JWT_REFRESH_EXPIRES_IN,
    issuer: "contest-api",
    audience: "contest-app",
  } as jwt.SignOptions);
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (
  payload: Omit<JwtPayload, "type">
): TokenPair => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

/**
 * Verify and decode JWT token
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET, {
      issuer: "contest-api",
      audience: "contest-app",
    } as jwt.VerifyOptions) as JwtPayload;


    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw createError("TOKEN_EXPIRED", 401);
    }


    if (error instanceof jwt.JsonWebTokenError) {
      throw createError("INVALID_TOKEN", 401);
    }

    throw createError("TOKEN_VERIFICATION_FAILED", 401);
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1] ?? null;
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as any;


    if (!decoded || !decoded.exp) {
      return null;
    }


    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

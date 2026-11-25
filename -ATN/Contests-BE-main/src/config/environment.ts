import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Server
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string().url('Invalid database URL'),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).transform(Number).default('100'),
  
  // File Upload
  MAX_FILE_SIZE: z.string().regex(/^\d+$/).transform(Number).default('5242880'), // 5MB
  UPLOAD_DIR: z.string().default('uploads'),
});

// Validate environment variables
let config: z.infer<typeof envSchema>;

try {
  config = envSchema.parse({
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    LOG_LEVEL: process.env.LOG_LEVEL,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
    UPLOAD_DIR: process.env.UPLOAD_DIR,
  });
} catch (error) {
  console.error('❌ Invalid environment configuration:', error);
  process.exit(1);
}

export const CONFIG = {
  ...config,
  // Computed values
  IS_PRODUCTION: config.NODE_ENV === 'production',
  IS_DEVELOPMENT: config.NODE_ENV === 'development',
  IS_TEST: config.NODE_ENV === 'test',
} as const;

export type Config = typeof CONFIG;

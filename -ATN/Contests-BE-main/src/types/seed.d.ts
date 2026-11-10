import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'winston';

export interface SeedParams {
    prisma: PrismaClient;
    logger: Logger;
    env?: NodeJS.ProcessEnv;
}

// Giá trị mặc định cho env
export const defaultSeedParams: Partial<SeedParams> = {
    env: process.env
};
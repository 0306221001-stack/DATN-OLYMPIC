# Types Directory

This directory contains all global TypeScript type definitions, interfaces, and type utilities used across the contest backend application.

## Purpose

The `types` directory serves as a centralized location for:
- Global type definitions that are used across multiple modules
- Common interfaces shared between different parts of the application
- Type utilities and helper types
- External library type augmentations
- API response and request type definitions

## Structure

```
src/types/
├── README.md           # This file
├── global.ts          # Global type definitions
├── api.ts             # API request/response types
├── database.ts        # Database-related types
├── auth.ts            # Authentication & authorization types
├── contest.ts         # Contest-specific types
├── user.ts            # User-related types
└── utils.ts           # Type utilities and helpers
```

## Naming Conventions

### Interfaces
- Use PascalCase with descriptive names
- Prefix with `I` if needed to avoid naming conflicts
- Example: `User`, `ContestData`, `ApiResponse`

### Types
- Use PascalCase for type aliases
- Use descriptive names that indicate purpose
- Example: `UserRole`, `ContestStatus`, `DatabaseConfig`

### Enums
- Use PascalCase for enum names
- Use UPPER_SNAKE_CASE for enum values
- Example: `UserStatus.ACTIVE`, `ContestType.PROGRAMMING`

## File Guidelines

### global.ts
Contains application-wide types that don't belong to specific modules:
```typescript
// Global utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };

// Common enums
export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test'
}
```

### api.ts
Standard API response and request structures:
```typescript
// Standard API response format
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Module-specific types
Each module should have its corresponding type file (user.ts, contest.ts, etc.):
```typescript
// user.ts
export interface User {
  id: string;
  email: string;
  username: string;
  // ... other properties
}

export type CreateUserRequest = Omit<User, 'id'>;
export type UpdateUserRequest = Partial<CreateUserRequest>;
```

## Usage Guidelines

### 1. Import Types Consistently
```typescript
// Preferred: Named imports
import type { User, ApiResponse } from '@/types/user';
import type { ContestStatus } from '@/types/contest';

// Avoid: Default imports for types
```

### 2. Use Type-Only Imports
```typescript
// Correct: Use 'type' keyword for type-only imports
import type { User } from '@/types/user';

// Incorrect: Regular import for types
import { User } from '@/types/user';
```

### 3. Export Types Properly
```typescript
// Export interfaces and types explicitly
export interface User { /* ... */ }
export type UserRole = 'admin' | 'participant' | 'judge';

// Export type utilities
export type CreateUser = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
```

### 4. Extend Base Types
```typescript
// Create base types and extend them
interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseEntity {
  email: string;
  username: string;
}
```

## Best Practices

### 1. Keep Types Close to Usage
- Only put types here if they're used in multiple modules
- Module-specific types can stay in the module's `*.schema.ts` files

### 2. Use Descriptive Names
```typescript
// Good
export interface ContestParticipant {
  userId: string;
  contestId: string;
  registrationDate: Date;
}

// Bad
export interface CP {
  uid: string;
  cid: string;
  rd: Date;
}
```

### 3. Document Complex Types
```typescript
/**
 * Represents a contest submission with all related metadata
 * @interface ContestSubmission
 */
export interface ContestSubmission {
  /** Unique identifier for the submission */
  id: string;
  /** The source code submitted by participant */
  code: string;
  /** Programming language used */
  language: ProgrammingLanguage;
  /** Timestamp when submission was made */
  submittedAt: Date;
}
```

### 4. Use Union Types for Enums
```typescript
// Preferred: Union types for flexibility
export type UserRole = 'admin' | 'participant' | 'judge';
export type ContestStatus = 'draft' | 'active' | 'completed' | 'cancelled';

// Alternative: Enums for more structure
export enum ContestType {
  PROGRAMMING = 'programming',
  QUIZ = 'quiz',
  DESIGN = 'design'
}
```

### 5. Utility Types for DRY Code
```typescript
// Create reusable utility types
export type EntityWithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

export type CreateRequest<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateRequest<T> = Partial<CreateRequest<T>>;

// Usage
export type CreateUserRequest = CreateRequest<User>;
export type UpdateContestRequest = UpdateRequest<Contest>;
```

## Integration with Other Parts

### With Zod Schemas
```typescript
// Define the type first
export interface User {
  id: string;
  email: string;
  username: string;
}

// Then create Zod schema in module
import type { User } from '@/types/user';
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3)
}) satisfies z.ZodType<Omit<User, 'id'>>;
```

### With Prisma
```typescript
// Extend Prisma generated types when needed
import type { User as PrismaUser } from '@prisma/client';

export interface User extends PrismaUser {
  // Add computed properties or methods
  fullName?: string;
}
```

## Common Patterns

### 1. API Endpoint Types
```typescript
// Group related API types together
export namespace UserAPI {
  export type GetUsersResponse = ApiResponse<PaginatedResponse<User>>;
  export type CreateUserRequest = CreateRequest<User>;
  export type CreateUserResponse = ApiResponse<User>;
  export type UpdateUserRequest = UpdateRequest<User>;
}
```

### 2. Database Entity Types
```typescript
// Separate database entities from API models
export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string; // Not exposed in API
  createdAt: Date;
  updatedAt: Date;
}

export interface UserModel extends Omit<UserEntity, 'passwordHash'> {
  // Public user model without sensitive data
}
```

### 3. Configuration Types
```typescript
// Type-safe configuration
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface AppConfig {
  port: number;
  environment: Environment;
  database: DatabaseConfig;
  jwt: {
    secret: string;
    expiresIn: string;
  };
}
```

## Migration Guide

When moving types to this directory:

1. **Identify Shared Types**: Look for types used in multiple modules
2. **Create Appropriate Files**: Use the file structure above
3. **Update Imports**: Change relative imports to absolute imports
4. **Add Type-Only Imports**: Use `import type` for better tree-shaking
5. **Update tsconfig.json**: Ensure path mapping is configured

## Path Mapping

Ensure your `tsconfig.json` includes:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/types/*": ["src/types/*"]
    }
  }
}
```

This allows clean imports:
```typescript
import type { User, ApiResponse } from '@/types/user';
import type { ContestStatus } from '@/types/contest';
```

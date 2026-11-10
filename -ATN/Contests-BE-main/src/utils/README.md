# Utils Directory

This directory contains utility functions, helper methods, and common functionality that can be reused across different modules in the contest backend application.

## Purpose

The `utils` directory serves as a centralized location for:
- Reusable utility functions that don't belong to specific modules
- Helper methods for common operations (formatting, validation, etc.)
- Cross-cutting concerns (logging, error handling, etc.)
- Third-party library wrappers and adapters
- Common algorithms and data processing functions

## Structure

```
src/utils/
├── README.md           # This file
├── logger.ts          # Winston logger configuration and utilities
├── auth.ts            # Authentication utilities (JWT, password hashing)
├── validation.ts      # Common validation helpers
├── database.ts        # Database utility functions
├── response.ts        # API response formatting utilities
├── crypto.ts          # Cryptographic utilities
├── date.ts            # Date manipulation utilities
├── string.ts          # String processing utilities
├── email.ts           # Email utilities and templates
├── file.ts            # File handling utilities
├── pagination.ts      # Pagination helper functions
└── constants.ts       # Utility constants and enums
```

## Naming Conventions

### Functions
- Use camelCase for function names
- Use descriptive, action-oriented names
- Example: `hashPassword`, `generateToken`, `formatDate`

### Files
- Use lowercase with descriptive names
- Group related utilities in the same file
- Example: `auth.ts`, `validation.ts`, `date.ts`

### Constants
- Use UPPER_SNAKE_CASE for constants
- Group related constants together
- Example: `DEFAULT_PAGE_SIZE`, `MAX_FILE_SIZE`

## File Guidelines

### logger.ts
Winston logger configuration and logging utilities:
```typescript
import winston from 'winston';

// Logger instance configuration
export const logger = winston.createLogger({
  // ... configuration
});

// Utility functions
export const logError = (error: Error, context?: string) => {
  logger.error(`${context ? `[${context}] ` : ''}${error.message}`, { 
    stack: error.stack 
  });
};

export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};
```

### auth.ts
Authentication and authorization utilities:
```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Password hashing
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

export const comparePassword = async (
  password: string, 
  hash: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// JWT utilities
export const generateToken = (payload: object): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, process.env.JWT_SECRET!);
};
```

### response.ts
Standardized API response formatting:
```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
}

export const successResponse = <T>(
  message: string, 
  data?: T
): ApiResponse<T> => ({
  success: true,
  message,
  ...(data && { data })
});

export const errorResponse = (
  message: string, 
  error?: any
): ApiResponse => ({
  success: false,
  message,
  ...(error && { error })
});
```

### validation.ts
Common validation helpers:
```typescript
import { z } from 'zod';

// Email validation
export const isValidEmail = (email: string): boolean => {
  return z.string().email().safeParse(email).success;
};

// Password strength validation
export const isStrongPassword = (password: string): boolean => {
  return z.string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .safeParse(password).success;
};

// Custom validation helpers
export const validateObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};
```

## Usage Guidelines

### 1. Import Utilities Consistently
```typescript
// Preferred: Named imports
import { logger, logError } from '@/utils/logger';
import { hashPassword, comparePassword } from '@/utils/auth';
import { successResponse, errorResponse } from '@/utils/response';

// Group related imports
import { 
  formatDate, 
  addDays, 
  isDateValid 
} from '@/utils/date';
```

### 2. Use Type-Safe Utilities
```typescript
// Provide proper TypeScript types
export const paginate = <T>(
  items: T[], 
  page: number, 
  limit: number
): { items: T[]; total: number; hasNext: boolean } => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    items: items.slice(startIndex, endIndex),
    total: items.length,
    hasNext: endIndex < items.length
  };
};
```

### 3. Handle Errors Gracefully
```typescript
// Always handle potential errors
export const parseJSON = <T>(jsonString: string): T | null => {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logError(error as Error, 'parseJSON');
    return null;
  }
};
```

### 4. Make Functions Pure When Possible
```typescript
// Pure functions are easier to test and reason about
export const calculateDiscount = (
  price: number, 
  discountPercent: number
): number => {
  return price * (1 - discountPercent / 100);
};

// Avoid side effects when possible
export const formatCurrency = (
  amount: number, 
  currency = 'USD'
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};
```

## Best Practices

### 1. Single Responsibility
Each utility function should have a single, clear purpose:
```typescript
// Good: Single responsibility
export const generateRandomString = (length: number): string => {
  // Implementation
};

export const encodeBase64 = (input: string): string => {
  // Implementation
};

// Bad: Multiple responsibilities
export const processUserData = (userData: any) => {
  // Validates, transforms, and saves user data
};
```

### 2. Descriptive Function Names
```typescript
// Good: Clear and descriptive
export const convertTimestampToDate = (timestamp: number): Date => {
  return new Date(timestamp * 1000);
};

export const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[^a-z0-9.-]/gi, '_');
};

// Bad: Unclear names
export const convert = (ts: number): Date => { /* ... */ };
export const clean = (fn: string): string => { /* ... */ };
```

### 3. Use Default Parameters
```typescript
// Provide sensible defaults
export const generateSlug = (
  text: string, 
  separator: string = '-',
  maxLength: number = 50
): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, separator)
    .substring(0, maxLength);
};
```

### 4. Document Complex Utilities
```typescript
/**
 * Calculates the Levenshtein distance between two strings
 * Used for fuzzy string matching and similarity scoring
 * 
 * @param str1 - First string to compare
 * @param str2 - Second string to compare
 * @returns The edit distance between the strings
 */
export const calculateEditDistance = (str1: string, str2: string): number => {
  // Implementation
};
```

### 5. Use Proper Error Handling
```typescript
export const downloadFile = async (url: string): Promise<Buffer | null> => {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    logError(error as Error, 'downloadFile');
    return null;
  }
};
```

## Common Utility Categories

### 1. Date Utilities
```typescript
// date.ts
export const formatDate = (date: Date, format: string): string => { /* ... */ };
export const addDays = (date: Date, days: number): Date => { /* ... */ };
export const getDaysDifference = (date1: Date, date2: Date): number => { /* ... */ };
export const isWeekend = (date: Date): boolean => { /* ... */ };
```

### 2. String Utilities
```typescript
// string.ts
export const capitalize = (str: string): string => { /* ... */ };
export const truncate = (str: string, length: number): string => { /* ... */ };
export const generateSlug = (text: string): string => { /* ... */ };
export const extractEmails = (text: string): string[] => { /* ... */ };
```

### 3. Array Utilities
```typescript
// array.ts
export const chunk = <T>(array: T[], size: number): T[][] => { /* ... */ };
export const unique = <T>(array: T[]): T[] => { /* ... */ };
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => { /* ... */ };
export const shuffle = <T>(array: T[]): T[] => { /* ... */ };
```

### 4. Validation Utilities
```typescript
// validation.ts
export const isValidUUID = (uuid: string): boolean => { /* ... */ };
export const isValidPhoneNumber = (phone: string): boolean => { /* ... */ };
export const sanitizeHtml = (html: string): string => { /* ... */ };
export const validateFileType = (file: Express.Multer.File, allowedTypes: string[]): boolean => { /* ... */ };
```

### 5. Database Utilities
```typescript
// database.ts
export const buildWhereClause = (filters: Record<string, any>): any => { /* ... */ };
export const buildOrderByClause = (sortBy: string, sortOrder: 'asc' | 'desc'): any => { /* ... */ };
export const transformPrismaError = (error: any): string => { /* ... */ };
```

## Testing Utilities

Create corresponding test files for utilities:
```typescript
// __tests__/auth.test.ts
import { hashPassword, comparePassword } from '../auth';

describe('Auth Utilities', () => {
  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(await comparePassword(password, hash)).toBe(true);
    });
  });
});
```

## Configuration

### Path Mapping
Ensure your `tsconfig.json` includes:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/utils/*": ["src/utils/*"]
    }
  }
}
```

### ESLint Rules
Add utility-specific ESLint rules:
```json
{
  "rules": {
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

## Performance Considerations

### 1. Memoization for Expensive Operations
```typescript
const memoizedResults = new Map<string, any>();

export const expensiveCalculation = (input: string): any => {
  if (memoizedResults.has(input)) {
    return memoizedResults.get(input);
  }
  
  const result = performCalculation(input);
  memoizedResults.set(input, result);
  return result;
};
```

### 2. Lazy Loading for Heavy Dependencies
```typescript
let heavyLibrary: any;

export const useHeavyLibrary = async () => {
  if (!heavyLibrary) {
    heavyLibrary = await import('heavy-library');
  }
  return heavyLibrary;
};
```

## Migration Guide

When adding new utilities:

1. **Identify Reusability**: Ensure the function is truly reusable
2. **Choose Appropriate File**: Group with related utilities
3. **Add Type Safety**: Provide proper TypeScript types
4. **Write Tests**: Create comprehensive test coverage
5. **Document Usage**: Add JSDoc comments for complex functions
6. **Update Exports**: Ensure proper export from index files

## Integration with Modules

Utilities should be imported and used consistently across modules:

```typescript
// In a service file
import { logger } from '@/utils/logger';
import { hashPassword } from '@/utils/auth';
import { successResponse, errorResponse } from '@/utils/response';

export class UserService {
  async createUser(userData: CreateUserRequest) {
    try {
      logger.info('Creating new user', { email: userData.email });
      
      const hashedPassword = await hashPassword(userData.password);
      // ... create user logic
      
      return successResponse('User created successfully', user);
    } catch (error) {
      logger.error('Failed to create user', error);
      return errorResponse('Failed to create user');
    }
  }
}
```

This structure ensures that utilities are well-organized, properly documented, and easy to maintain across the contest backend application.

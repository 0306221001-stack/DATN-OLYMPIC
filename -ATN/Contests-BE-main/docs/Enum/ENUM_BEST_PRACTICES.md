# Enum API Best Practices and Guidelines

## Overview
This document outlines best practices, coding standards, and guidelines for working with the Enum API in the Contest Backend system.

## Code Organization Best Practices

### 1. Module Structure Standards

#### File Organization
```
src/modules/enum/
├── enum.controller.ts    # Keep controllers focused and thin
├── enum.service.ts       # Business logic and data transformations
├── enum.routes.ts        # Route definitions only
├── enum.types.ts         # TypeScript interfaces (if needed)
├── __tests__/           # Test files
│   ├── enum.service.test.ts
│   ├── enum.controller.test.ts
│   └── enum.integration.test.ts
└── index.ts             # Clean module exports
```

#### Separation of Concerns
- **Controllers**: Handle HTTP requests/responses only
- **Services**: Contain business logic and data processing
- **Routes**: Define endpoints and middleware only
- **Types**: Centralized type definitions

### 2. Service Layer Best Practices

#### Error Handling
```typescript
// ✅ Good: Graceful error handling
async getEnumByName(enumName: string): Promise<EnumData | null> {
  try {
    const enumData = this.enumMap[enumName];
    if (!enumData) {
      logger.warn(`Enum not found: ${enumName}`);
      return null;
    }
    return this.formatEnumData(enumName, enumData);
  } catch (error) {
    logger.error(`Error getting enum ${enumName}:`, error);
    throw error;
  }
}

// ❌ Bad: Unhandled errors
async getEnumByName(enumName: string): Promise<EnumData> {
  return this.formatEnumData(enumName, this.enumMap[enumName]);
}
```

#### Data Validation
```typescript
// ✅ Good: Input validation
async getEnumByName(enumName: string): Promise<EnumData | null> {
  if (!enumName || typeof enumName !== 'string') {
    throw new Error('Invalid enum name provided');
  }
  
  const normalizedName = enumName.trim();
  if (!normalizedName) {
    throw new Error('Enum name cannot be empty');
  }
  
  // ... rest of logic
}

// ❌ Bad: No validation
async getEnumByName(enumName: string): Promise<EnumData | null> {
  return this.enumMap[enumName] || null;
}
```

#### Performance Optimization
```typescript
// ✅ Good: Efficient operations
private static enumMap: Record<string, any> = {
  Role,
  QuestionType,
  // ... other enums
};

// Pre-computed for faster access
private static enumNames: string[] = Object.keys(this.enumMap);

// ❌ Bad: Repeated computations
getEnumNames(): string[] {
  return Object.keys(this.enumMap); // Computed every time
}
```

### 3. Controller Best Practices

#### Response Consistency
```typescript
// ✅ Good: Consistent response format
async getAllEnums(req: Request, res: Response): Promise<void> {
  try {
    const enums = await this.enumService.getAllEnums();
    
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách enum thành công',
      data: enums,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in getAllEnums:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy enum',
      error: { code: 'INTERNAL_SERVER_ERROR' },
      timestamp: new Date().toISOString()
    });
  }
}
```

#### Proper HTTP Status Codes
```typescript
// ✅ Good: Appropriate status codes
async getEnumByName(req: Request, res: Response): Promise<void> {
  const { enumName } = req.params;
  
  try {
    const enumData = await this.enumService.getEnumByName(enumName);
    
    if (!enumData) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy enum',
        error: { code: 'RECORD_NOT_FOUND' }
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Lấy enum ${enumName} thành công`,
      data: enumData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy enum'
    });
  }
}
```

### 4. Route Configuration Best Practices

#### Clear Route Definitions
```typescript
// ✅ Good: Clear, RESTful routes
const router = express.Router();

router.get('/', enumController.getAllEnums);
router.get('/names', enumController.getEnumNames);
router.get('/:enumName', enumController.getEnumByName);
router.get('/:enumName/values', enumController.getEnumValues);
router.get('/:enumName/options', enumController.getEnumOptions);

// ❌ Bad: Unclear or non-RESTful routes
router.get('/all-enums', enumController.getAllEnums);
router.get('/get-names', enumController.getEnumNames);
router.post('/enum-by-name', enumController.getEnumByName);
```

#### Parameter Validation
```typescript
// ✅ Good: Route parameter validation
router.get('/:enumName', 
  param('enumName').isAlpha().withMessage('Enum name must contain only letters'),
  enumController.getEnumByName
);

// ❌ Bad: No validation
router.get('/:enumName', enumController.getEnumByName);
```

## Data Management Best Practices

### 1. Enum Definition Standards

#### Consistent Naming Convention
```typescript
// ✅ Good: Clear, consistent naming
export enum QuestionType {
  MultipleChoice = 'multiple_choice',
  Essay = 'essay'
}

export enum ContestStatus {
  Upcoming = 'upcoming',
  Ongoing = 'ongoing', 
  Finished = 'finished'
}

// ❌ Bad: Inconsistent naming
export enum QuestionType {
  MC = 'mc',
  Essay = 'essay_type'
}
```

#### Value Consistency
```typescript
// ✅ Good: Lowercase, snake_case values
export enum Difficulty {
  Alpha = 'alpha',
  Beta = 'beta',
  Rc = 'rc',
  Gold = 'gold'
}

// ❌ Bad: Mixed case, inconsistent format
export enum Difficulty {
  Alpha = 'Alpha',
  Beta = 'BETA',
  Rc = 'rc-level'
}
```

### 2. Translation Management

#### Centralized Translations
```typescript
// ✅ Good: Centralized translation mapping
private static enumLabels: Record<string, Record<string, string>> = {
  Role: {
    Admin: "Quản trị viên",
    Judge: "Giám khảo",
  },
  QuestionType: {
    multiple_choice: "Trắc nghiệm",
    essay: "Tự luận",
  }
};

// ❌ Bad: Scattered translations
getQuestionTypeLabel(value: string): string {
  if (value === 'multiple_choice') return 'Trắc nghiệm';
  if (value === 'essay') return 'Tự luận';
  return value;
}
```

#### Fallback Handling
```typescript
// ✅ Good: Graceful fallbacks
private static getLabel(enumName: string, value: string): string {
  const enumLabels = this.enumLabels[enumName];
  if (!enumLabels) {
    logger.warn(`No labels found for enum: ${enumName}`);
    return value; // Fallback to original value
  }
  
  return enumLabels[value] || value; // Fallback if specific label not found
}

// ❌ Bad: No fallback handling
private static getLabel(enumName: string, value: string): string {
  return this.enumLabels[enumName][value];
}
```

## Frontend Integration Best Practices

### 1. Client-Side Usage Patterns

#### React Hook Pattern
```typescript
// ✅ Good: Reusable custom hook
const useEnumOptions = (enumName: string) => {
  const [options, setOptions] = useState<EnumOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/enums/${enumName}/options`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${enumName} options`);
        }
        
        const data = await response.json();
        setOptions(data.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOptions();
  }, [enumName]);
  
  return { options, loading, error };
};

// ❌ Bad: Inline fetch without error handling
const Component = () => {
  const [options, setOptions] = useState([]);
  
  useEffect(() => {
    fetch('/api/enums/QuestionType/options')
      .then(res => res.json())
      .then(data => setOptions(data.data));
  }, []);
  
  return <select>...</select>;
};
```

#### Error Handling in Frontend
```typescript
// ✅ Good: Comprehensive error handling
const EnumSelect = ({ enumName, onSelect }) => {
  const { options, loading, error } = useEnumOptions(enumName);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (options.length === 0) return <div>No options available</div>;
  
  return (
    <select onChange={(e) => onSelect(e.target.value)}>
      <option value="">Chọn...</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

// ❌ Bad: No error handling
const EnumSelect = ({ enumName }) => {
  const [options, setOptions] = useState([]);
  
  useEffect(() => {
    fetch(`/api/enums/${enumName}/options`)
      .then(res => res.json())
      .then(data => setOptions(data.data));
  }, [enumName]);
  
  return (
    <select>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
```

### 2. Caching Strategies

#### Client-Side Caching
```typescript
// ✅ Good: Implement caching for better performance
class EnumCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  
  async get(key: string): Promise<any | null> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.data;
    }
    return null;
  }
  
  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

const enumCache = new EnumCache();

// ❌ Bad: Always fetch, no caching
const fetchEnumOptions = async (enumName: string) => {
  const response = await fetch(`/api/enums/${enumName}/options`);
  return response.json();
};
```

## Testing Best Practices

### 1. Unit Testing

#### Service Tests
```typescript
// ✅ Good: Comprehensive service tests
describe('EnumService', () => {
  let enumService: EnumService;
  
  beforeEach(() => {
    enumService = new EnumService();
  });
  
  describe('getAllEnums', () => {
    it('should return all available enums', async () => {
      const result = await enumService.getAllEnums();
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
    
    it('should include Vietnamese labels', async () => {
      const result = await enumService.getAllEnums();
      
      Object.values(result).forEach((enumData: any) => {
        expect(enumData.options).toBeDefined();
        enumData.options.forEach((option: any) => {
          expect(option.label).toBeDefined();
          expect(option.value).toBeDefined();
        });
      });
    });
  });
  
  describe('getEnumByName', () => {
    it('should return null for non-existent enum', async () => {
      const result = await enumService.getEnumByName('NonExistentEnum');
      expect(result).toBeNull();
    });
    
    it('should return proper data structure for valid enum', async () => {
      const result = await enumService.getEnumByName('QuestionType');
      
      expect(result).toBeDefined();
      expect(result?.name).toBe('QuestionType');
      expect(result?.values).toBeDefined();
      expect(result?.options).toBeDefined();
    });
  });
});
```

#### Controller Tests
```typescript
// ✅ Good: Controller integration tests
describe('EnumController', () => {
  let app: Express;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  describe('GET /api/enums', () => {
    it('should return 200 and all enums', async () => {
      const response = await request(app)
        .get('/api/enums')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.message).toContain('thành công');
    });
  });
  
  describe('GET /api/enums/:enumName', () => {
    it('should return 404 for invalid enum', async () => {
      const response = await request(app)
        .get('/api/enums/InvalidEnum')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RECORD_NOT_FOUND');
    });
  });
});
```

### 2. Integration Testing

#### API Testing
```typescript
// ✅ Good: End-to-end API tests
describe('Enum API Integration', () => {
  it('should handle complete enum workflow', async () => {
    // Get all enum names
    const namesResponse = await request(app).get('/api/enums/names');
    expect(namesResponse.status).toBe(200);
    
    const enumNames = namesResponse.body.data;
    
    // Test each enum individually
    for (const enumName of enumNames) {
      const enumResponse = await request(app).get(`/api/enums/${enumName}`);
      expect(enumResponse.status).toBe(200);
      
      const optionsResponse = await request(app).get(`/api/enums/${enumName}/options`);
      expect(optionsResponse.status).toBe(200);
      
      const valuesResponse = await request(app).get(`/api/enums/${enumName}/values`);
      expect(valuesResponse.status).toBe(200);
    }
  });
});
```

## Performance Best Practices

### 1. Response Optimization

#### Efficient Data Structures
```typescript
// ✅ Good: Pre-computed, efficient data structures
class EnumService {
  private static readonly enumData: Record<string, EnumData> = {};
  
  static {
    // Pre-compute all enum data at startup
    Object.entries(this.enumMap).forEach(([name, enumObj]) => {
      this.enumData[name] = this.formatEnumData(name, enumObj);
    });
  }
  
  async getAllEnums(): Promise<Record<string, EnumData>> {
    return this.enumData; // Return pre-computed data
  }
}

// ❌ Bad: Compute data on every request
async getAllEnums(): Promise<Record<string, EnumData>> {
  const result: Record<string, EnumData> = {};
  
  Object.entries(this.enumMap).forEach(([name, enumObj]) => {
    result[name] = this.formatEnumData(name, enumObj); // Computed every time
  });
  
  return result;
}
```

### 2. Memory Management

#### Avoid Memory Leaks
```typescript
// ✅ Good: Static data, no memory leaks
class EnumService {
  private static readonly enumMap = { /* enum data */ };
  private static readonly enumLabels = { /* labels */ };
  
  // Methods use static data, no instance state
}

// ❌ Bad: Instance state that could leak
class EnumService {
  private enumCache: Map<string, any> = new Map();
  
  constructor() {
    this.loadEnums(); // Could accumulate data over time
  }
}
```

## Security Best Practices

### 1. Input Validation

#### Sanitize Inputs
```typescript
// ✅ Good: Validate and sanitize inputs
async getEnumByName(enumName: string): Promise<EnumData | null> {
  // Validate input
  if (!enumName || typeof enumName !== 'string') {
    throw new Error('Invalid enum name');
  }
  
  // Sanitize input
  const sanitizedName = enumName.trim().replace(/[^a-zA-Z0-9]/g, '');
  
  if (!sanitizedName) {
    throw new Error('Enum name cannot be empty after sanitization');
  }
  
  // Use sanitized input
  return this.enumMap[sanitizedName] || null;
}
```

### 2. Error Information

#### Secure Error Messages
```typescript
// ✅ Good: Generic error messages for public API
catch (error) {
  logger.error('Enum service error:', error); // Log detailed error
  
  // Return generic message to client
  throw new Error('Unable to process enum request');
}

// ❌ Bad: Expose internal details
catch (error) {
  throw new Error(`Database connection failed: ${error.message}`);
}
```

## Monitoring and Logging

### 1. Request Logging

```typescript
// ✅ Good: Structured logging
async getAllEnums(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  logger.info('Enum request started', {
    endpoint: '/api/enums',
    method: 'GET',
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  try {
    const enums = await this.enumService.getAllEnums();
    
    logger.info('Enum request completed', {
      endpoint: '/api/enums',
      duration: Date.now() - startTime,
      enumCount: Object.keys(enums).length
    });
    
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách enum thành công',
      data: enums
    });
  } catch (error) {
    logger.error('Enum request failed', {
      endpoint: '/api/enums',
      duration: Date.now() - startTime,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy enum'
    });
  }
}
```

### 2. Performance Monitoring

```typescript
// ✅ Good: Track performance metrics
class EnumService {
  private static metrics = {
    requestCount: 0,
    totalResponseTime: 0,
    errorCount: 0
  };
  
  async getAllEnums(): Promise<Record<string, EnumData>> {
    const startTime = Date.now();
    this.metrics.requestCount++;
    
    try {
      const result = this.enumData;
      this.metrics.totalResponseTime += Date.now() - startTime;
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }
  
  static getMetrics() {
    return {
      ...this.metrics,
      averageResponseTime: this.metrics.totalResponseTime / this.metrics.requestCount,
      errorRate: this.metrics.errorCount / this.metrics.requestCount
    };
  }
}
```

## Documentation Standards

### 1. Code Documentation

```typescript
/**
 * Retrieves all available enums with their values and options
 * @returns Promise resolving to all enum data with Vietnamese labels
 * @throws Error if unable to process enum data
 * @example
 * ```typescript
 * const enums = await enumService.getAllEnums();
 * console.log(enums.QuestionType.options);
 * ```
 */
async getAllEnums(): Promise<Record<string, EnumData>> {
  return this.enumData;
}
```

### 2. API Documentation

Keep API documentation current with implementation:
- Update response examples when formats change
- Document all error scenarios
- Include usage examples for frontend integration
- Maintain change logs for version tracking

## Conclusion

Following these best practices ensures:

- **Maintainable Code**: Clear structure and consistent patterns
- **Performance**: Optimized data structures and caching
- **Security**: Proper input validation and error handling
- **Reliability**: Comprehensive testing and monitoring
- **Developer Experience**: Clear documentation and intuitive APIs

Regular code reviews should check adherence to these practices, and any deviations should be documented and justified.

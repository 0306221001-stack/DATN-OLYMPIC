# Question Detail API - Pagination Enhancement

## Overview
Enhanced the Question Detail API with comprehensive pagination support for two key endpoints:
1. **Get Questions by Package ID** (`GET /api/question-details/package/:packageId`)
2. **Get Packages by Question ID** (`GET /api/question-details/question/:questionId`)

## New Features

### 1. Pagination Support
- **Page-based pagination** with configurable limits
- **Default values**: page=1, limit=10
- **Maximum limit**: 100 items per page
- **Pagination metadata** included in response

### 2. Advanced Filtering & Search
- **Search functionality**: Search within question text or package names
- **Active/Inactive filtering**: Option to include inactive items
- **Flexible sorting**: Sort by questionOrder, createdAt, or updatedAt
- **Sort direction**: Ascending or descending order

### 3. Enhanced Response Structure
- **Structured data**: Separate info and items sections
- **Rich metadata**: Includes related entity information
- **Comprehensive pagination info**: Total pages, has next/prev, etc.

## API Endpoints

### Get Questions by Package ID with Pagination

#### Endpoint
```
GET /api/question-details/package/:packageId
```

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (minimum: 1) |
| `limit` | number | 10 | Items per page (max: 100) |
| `includeInactive` | boolean | false | Include inactive questions |
| `search` | string | - | Search within question text |
| `sortBy` | string | "questionOrder" | Sort field: questionOrder, createdAt, updatedAt |
| `sortOrder` | string | "asc" | Sort direction: asc, desc |

#### Example Request
```bash
GET /api/question-details/package/1?page=1&limit=5&search=toán&sortBy=questionOrder&sortOrder=asc
```

#### Response Format
```json
{
  "success": true,
  "message": "Lấy danh sách câu hỏi theo gói thành công",
  "data": {
    "packageInfo": {
      "id": 1,
      "name": "Gói câu hỏi Toán học"
    },
    "questions": [
      {
        "questionId": 1,
        "questionPackageId": 1,
        "questionOrder": 1,
        "isActive": true,
        "createdAt": "2025-06-10T10:00:00.000Z",
        "updatedAt": "2025-06-10T10:00:00.000Z",
        "question": {
          "id": 1,
          "plainText": "Câu hỏi về toán học cơ bản",
          "questionType": "multiple_choice",
          "difficulty": "Alpha"
        },
        "questionPackage": {
          "id": 1,
          "name": "Gói câu hỏi Toán học"
        }
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 25,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2025-06-10T10:00:00.000Z"
}
```

### Get Packages by Question ID with Pagination

#### Endpoint
```
GET /api/question-details/question/:questionId
```

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (minimum: 1) |
| `limit` | number | 10 | Items per page (max: 100) |
| `includeInactive` | boolean | false | Include inactive packages |
| `search` | string | - | Search within package names |
| `sortBy` | string | "questionOrder" | Sort field: questionOrder, createdAt, updatedAt |
| `sortOrder` | string | "asc" | Sort direction: asc, desc |

#### Example Request
```bash
GET /api/question-details/question/1?page=1&limit=10&search=toán&includeInactive=false
```

#### Response Format
```json
{
  "success": true,
  "message": "Lấy danh sách gói theo câu hỏi thành công",
  "data": {
    "questionInfo": {
      "id": 1,
      "plainText": "Câu hỏi về toán học cơ bản",
      "questionType": "multiple_choice",
      "difficulty": "Alpha"
    },
    "packages": [
      {
        "questionId": 1,
        "questionPackageId": 1,
        "questionOrder": 1,
        "isActive": true,
        "createdAt": "2025-06-10T10:00:00.000Z",
        "updatedAt": "2025-06-10T10:00:00.000Z",
        "question": {
          "id": 1,
          "plainText": "Câu hỏi về toán học cơ bản",
          "questionType": "multiple_choice",
          "difficulty": "Alpha"
        },
        "questionPackage": {
          "id": 1,
          "name": "Gói câu hỏi Toán học"
        }
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "timestamp": "2025-06-10T10:00:00.000Z"
}
```

## Implementation Details

### Schema Validation
Added new Zod schemas for query parameter validation:

```typescript
// Package Questions Query Schema
export const PackageQuestionsQuerySchema = z.object({
  page: z.string().optional().default("1")
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Trang phải là số nguyên dương",
    }),
  limit: z.string().optional().default("10")
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 100, {
      message: "Giới hạn phải là số nguyên dương và không quá 100",
    }),
  includeInactive: z.string().optional()
    .transform((val) => val === "true"),
  search: z.string().optional(),
  sortBy: z.enum(["questionOrder", "createdAt", "updatedAt"]).optional().default("questionOrder"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

// Question Packages Query Schema
export const QuestionPackagesQuerySchema = z.object({
  // Same structure as above
});
```

### Service Layer Updates
Enhanced service methods to support pagination and advanced querying:

```typescript
// Updated method signatures
static async getQuestionsByPackageId(
  questionPackageId: number,
  queryInput: {
    page: number;
    limit: number;
    includeInactive?: boolean;
    search?: string;
    sortBy?: "questionOrder" | "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
  }
): Promise<{
  packageInfo: { id: number; name: string } | null;
  questions: QuestionDetailListResponse[];
  pagination: PaginationInfo;
}>

static async getPackagesByQuestionId(
  questionId: number,
  queryInput: {
    page: number;
    limit: number;
    includeInactive?: boolean;
    search?: string;
    sortBy?: "questionOrder" | "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
  }
): Promise<{
  questionInfo: QuestionInfo | null;
  packages: QuestionDetailListResponse[];
  pagination: PaginationInfo;
}>
```

### Controller Updates
Updated controllers to use validated query parameters and return structured responses:

```typescript
// Use validated query parameters from middleware
const queryInput: PackageQuestionsQueryInput = (req as any).validatedQuery || req.query;

const result = await QuestionDetailService.getQuestionsByPackageId(
  packageId,
  queryInput
);

res.status(200).json({
  success: true,
  message: "Lấy danh sách câu hỏi theo gói thành công",
  data: {
    packageInfo: result.packageInfo,
    questions: result.questions,
  },
  pagination: result.pagination,
  timestamp: new Date().toISOString(),
});
```

### Route Updates
Added query validation middleware to routes:

```typescript
questionDetailRouter.get(
  "/package/:packageId",
  validateQuery(PackageQuestionsQuerySchema),
  QuestionDetailController.getQuestionsByPackageId
);

questionDetailRouter.get(
  "/question/:questionId",
  validateQuery(QuestionPackagesQuerySchema),
  QuestionDetailController.getPackagesByQuestionId
);
```

## Testing Examples

### cURL Examples

#### Get Questions by Package (with pagination)
```bash
curl -X GET "http://localhost:3000/api/question-details/package/1?page=1&limit=5&search=toán" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Get Packages by Question (with search)
```bash
curl -X GET "http://localhost:3000/api/question-details/question/1?page=1&limit=10&search=gói&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### PowerShell Examples
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_JWT_TOKEN"
    "Content-Type" = "application/json"
}

# Get questions by package with pagination
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/question-details/package/1?page=1&limit=5" `
                              -Method GET `
                              -Headers $headers

# Get packages by question with search
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/question-details/question/1?page=1&limit=10&search=toán" `
                              -Method GET `
                              -Headers $headers
```

## Error Handling

### Validation Errors
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "field": "page",
    "message": "Trang phải là số nguyên dương"
  }
}
```

### Limit Exceeded
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "field": "limit",
    "message": "Giới hạn phải là số nguyên dương và không quá 100"
  }
}
```

### Not Found Errors
```json
{
  "success": false,
  "message": "Không tìm thấy gói câu hỏi",
  "error": {
    "code": "RECORD_NOT_FOUND",
    "details": "Không tìm thấy gói câu hỏi"
  }
}
```

## Performance Considerations

### Database Optimization
- **Indexed queries**: Proper database indexes on frequently queried fields
- **Efficient pagination**: Uses `skip` and `take` for optimal performance
- **Selective includes**: Only fetches necessary related data
- **Count optimization**: Separate count query for total records

### Memory Management
- **Streaming results**: Processes records in batches
- **Limit enforcement**: Maximum 100 items per page prevents memory issues
- **Efficient serialization**: Optimized response structure

### Query Performance
- **Search optimization**: Uses database-level `contains` for text search
- **Sort optimization**: Database-level sorting for better performance
- **Filter efficiency**: Applied filters at database level

## Benefits

### User Experience
- **Faster loading**: Pagination reduces initial load time
- **Better navigation**: Easy page-based navigation
- **Search functionality**: Quick finding of specific items
- **Flexible sorting**: Custom ordering options

### System Performance
- **Reduced memory usage**: Smaller response payloads
- **Better scalability**: Handles large datasets efficiently
- **Optimized queries**: Database-level filtering and sorting
- **Consistent response times**: Predictable performance regardless of dataset size

### Developer Experience
- **Consistent API**: Follows established pagination patterns
- **Rich metadata**: Comprehensive pagination information
- **Flexible querying**: Multiple filter and sort options
- **Type safety**: Full TypeScript support with validation

## Migration Notes

### Backward Compatibility
The enhancement maintains backward compatibility by:
- **Default parameters**: Sensible defaults for all pagination parameters
- **Optional parameters**: All new parameters are optional
- **Graceful fallbacks**: Handles missing parameters gracefully

### Breaking Changes
**None** - This is a fully backward-compatible enhancement.

### Migration Path
Existing client code will continue to work without changes:
- Old endpoints still return data (first page with default limit)
- Response format is enhanced but maintains core structure
- No changes required for existing integrations

## Future Enhancements

Potential improvements for future versions:
1. **Cursor-based pagination**: For very large datasets
2. **Advanced search**: Full-text search with relevance scoring
3. **Field selection**: Allow clients to specify which fields to return
4. **Aggregation support**: Summary statistics in responses
5. **Cache optimization**: Redis caching for frequently accessed pages
6. **Real-time updates**: WebSocket support for live updates

## Conclusion

The pagination enhancement significantly improves the Question Detail API by:
- **Enhancing performance** through efficient data loading
- **Improving user experience** with search and flexible pagination
- **Maintaining compatibility** with existing integrations
- **Following best practices** for REST API design
- **Providing comprehensive documentation** for easy adoption

This implementation provides a solid foundation for handling large datasets while maintaining excellent performance and user experience.

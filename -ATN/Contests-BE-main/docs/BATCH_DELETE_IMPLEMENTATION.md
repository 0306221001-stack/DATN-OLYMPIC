# Batch Delete Implementation Summary

## Overview
Successfully implemented batch delete functionality for the Question Management system across three core modules:
- **Question Topics** (`/api/question-topics/batch-delete`)
- **Question Packages** (`/api/question-packages/batch-delete`) 
- **Question Details** (`/api/question-details/batch-delete`)

## Implementation Details

### 1. Schema Validation
Each module now includes comprehensive Zod schemas for batch delete operations:

#### Question Topics
```typescript
export const BatchDeleteQuestionTopicsSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải cung cấp ít nhất một ID")
    .max(100, "Không thể xóa quá 100 mục cùng lúc"),
});
```

#### Question Packages  
```typescript
export const BatchDeleteQuestionPackagesSchema = z.object({
  ids: z
    .array(z.number().int().positive("ID phải là số nguyên dương"))
    .min(1, "Phải cung cấp ít nhất một ID")
    .max(100, "Không thể xóa quá 100 mục cùng lúc"),
});
```

#### Question Details
```typescript
export const BatchDeleteQuestionDetailsSchema = z.object({
  items: z
    .array(z.object({
      questionId: z.number().int().positive("ID câu hỏi phải là số nguyên dương"),
      questionPackageId: z.number().int().positive("ID gói câu hỏi phải là số nguyên dương"),
    }))
    .min(1, "Phải cung cấp ít nhất một mục để xóa")
    .max(100, "Không thể xóa quá 100 mục cùng lúc"),
});
```

### 2. Service Layer Implementation

All service methods implement robust business logic with:
- **Individual Processing**: Each item is processed separately to handle partial failures
- **Business Rule Validation**: Prevents deletion of items with active dependencies
- **Detailed Response**: Returns comprehensive success/failure reports
- **Soft Delete**: Sets `isActive = false` rather than hard deletion

#### Business Rules Enforced:
- **Question Topics**: Cannot delete if topic has active questions
- **Question Packages**: Cannot delete if package has active question details or is used in active matches
- **Question Details**: Cannot delete if question detail is being used in active matches

### 3. Response Format
Standardized `BatchDeleteResponse` interface across all modules:
```typescript
interface BatchDeleteResponse {
  totalRequested: number;
  successful: number;
  failed: number;
  successfulItems: Array<{ /* item identifiers */ }>;
  failedItems: Array<{
    /* item identifiers */
    reason: string;
  }>;
}
```

### 4. API Endpoints

#### Question Topics
- **Endpoint**: `POST /api/question-topics/batch-delete`
- **Auth**: Required (Admin/Judge)
- **Input**: `{ ids: number[] }`

#### Question Packages  
- **Endpoint**: `POST /api/question-packages/batch-delete`
- **Auth**: Required (Admin/Judge)
- **Input**: `{ ids: number[] }`

#### Question Details
- **Endpoint**: `POST /api/question-details/batch-delete`
- **Auth**: Required (Admin/Judge) 
- **Input**: `{ items: Array<{ questionId: number, questionPackageId: number }> }`

## JSON Request/Response Examples

### Question Topics Batch Delete

#### Request Format
```json
POST /api/question-topics/batch-delete
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
  "ids": [1, 2, 3, 4, 5]
}
```

#### Successful Response (All items deleted)
```json
{
  "success": true,
  "message": "Batch delete completed successfully",
  "data": {
    "totalRequested": 5,
    "successful": 5,
    "failed": 0,
    "successfulItems": [
      { "id": 1 },
      { "id": 2 },
      { "id": 3 },
      { "id": 4 },
      { "id": 5 }
    ],
    "failedItems": []
  }
}
```

#### Partial Success Response
```json
{
  "success": true,
  "message": "Batch delete completed with some failures",
  "data": {
    "totalRequested": 5,
    "successful": 3,
    "failed": 2,
    "successfulItems": [
      { "id": 1 },
      { "id": 3 },
      { "id": 5 }
    ],
    "failedItems": [
      {
        "id": 2,
        "reason": "Không thể xóa chủ đề này vì đang có câu hỏi sử dụng"
      },
      {
        "id": 4,
        "reason": "Không tìm thấy chủ đề câu hỏi với ID: 4"
      }
    ]
  }
}
```

### Question Packages Batch Delete

#### Request Format
```json
POST /api/question-packages/batch-delete
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
  "ids": [10, 20, 30]
}
```

#### Successful Response
```json
{
  "success": true,
  "message": "Batch delete completed successfully",
  "data": {
    "totalRequested": 3,
    "successful": 3,
    "failed": 0,
    "successfulItems": [
      { "id": 10 },
      { "id": 20 },
      { "id": 30 }
    ],
    "failedItems": []
  }
}
```

#### Response with Business Rule Violations
```json
{
  "success": true,
  "message": "Batch delete completed with some failures",
  "data": {
    "totalRequested": 3,
    "successful": 1,
    "failed": 2,
    "successfulItems": [
      { "id": 30 }
    ],
    "failedItems": [
      {
        "id": 10,
        "reason": "Không thể xóa gói câu hỏi này vì đang có chi tiết câu hỏi sử dụng"
      },
      {
        "id": 20,
        "reason": "Không thể xóa gói câu hỏi này vì đang được sử dụng trong trận đấu"
      }
    ]
  }
}
```

### Question Details Batch Delete

#### Request Format
```json
POST /api/question-details/batch-delete
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
  "items": [
    {
      "questionId": 1,
      "questionPackageId": 10
    },
    {
      "questionId": 2,
      "questionPackageId": 10
    },
    {
      "questionId": 3,
      "questionPackageId": 20
    }
  ]
}
```

#### Successful Response
```json
{
  "success": true,
  "message": "Batch delete completed successfully",
  "data": {
    "totalRequested": 3,
    "successful": 3,
    "failed": 0,
    "successfulItems": [
      {
        "questionId": 1,
        "questionPackageId": 10
      },
      {
        "questionId": 2,
        "questionPackageId": 10
      },
      {
        "questionId": 3,
        "questionPackageId": 20
      }
    ],
    "failedItems": []
  }
}
```

#### Response with Active Match Usage
```json
{
  "success": true,
  "message": "Batch delete completed with some failures",
  "data": {
    "totalRequested": 3,
    "successful": 2,
    "failed": 1,
    "successfulItems": [
      {
        "questionId": 1,
        "questionPackageId": 10
      },
      {
        "questionId": 3,
        "questionPackageId": 20
      }
    ],
    "failedItems": [
      {
        "questionId": 2,
        "questionPackageId": 10,
        "reason": "Không thể xóa chi tiết câu hỏi này vì đang được sử dụng trong trận đấu"
      }
    ]
  }
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "field": "ids",
    "message": "Phải cung cấp ít nhất một ID"
  }
}
```

#### Authentication Error (401)
```json
{
  "success": false,
  "message": "Access token is required"
}
```

#### Authorization Error (403)
```json
{
  "success": false,
  "message": "Không có quyền truy cập"
}
```

#### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Database connection failed"
}
```

## HTTP Status Codes

The batch delete endpoints now return different HTTP status codes based on the operation results:

### Success Scenarios

#### 200 OK - Complete Success
Returned when **all items** are successfully deleted.

**Response Structure:**
```json
{
  "success": true,
  "message": "Xóa hàng loạt thành công: 5/5 mục đã được xóa",
  "data": {
    "totalRequested": 5,
    "successful": 5,
    "failed": 0,
    "successfulItems": [...],
    "failedItems": []
  },
  "timestamp": "2025-06-11T10:00:00.000Z"
}
```

#### 207 Multi-Status - Partial Success
Returned when **some items succeed and some fail**.

**Response Structure:**
```json
{
  "success": true,
  "message": "Xóa hàng loạt hoàn tất một phần: 3/5 thành công, 2 thất bại",
  "data": {
    "totalRequested": 5,
    "successful": 3,
    "failed": 2,
    "successfulItems": [...],
    "failedItems": [...]
  },
  "timestamp": "2025-06-11T10:00:00.000Z"
}
```

### Failure Scenarios

#### 400 Bad Request - Complete Failure
Returned when **all items fail** due to business rules or validation errors.

**Response Structure:**
```json
{
  "success": false,
  "message": "Xóa hàng loạt thất bại: 5/5 mục không thể xóa",
  "data": {
    "totalRequested": 5,
    "successful": 0,
    "failed": 5,
    "successfulItems": [],
    "failedItems": [...]
  },
  "timestamp": "2025-06-11T10:00:00.000Z"
}
```

### Status Code Summary

| Status Code | Scenario | Success Field | Description |
|-------------|----------|---------------|-------------|
| `200` | All items deleted | `true` | Complete success |
| `207` | Partial success | `true` | Some succeeded, some failed |
| `400` | All items failed | `false` | Complete failure due to business rules |
| `401` | Authentication | `false` | Missing or invalid authentication |
| `403` | Authorization | `false` | Insufficient permissions |
| `500` | Server Error | `false` | Internal server error |

### Client Handling Recommendations

**For Status 200 (Complete Success):**
- Show success message to user
- Update UI to reflect all items deleted
- No retry needed

**For Status 207 (Partial Success):**
- Show partial success message
- Display list of failed items with reasons
- Allow user to retry failed items
- Update UI for successful deletions only

**For Status 400 (Complete Failure):**
- Show error message with details
- Display reasons for failures
- Allow user to fix issues and retry
- Do not update UI

**For Status 401/403 (Auth Errors):**
- Redirect to login or show permission error
- Do not retry automatically

**For Status 500 (Server Error):**
- Show generic error message
- Allow user to retry after delay
- Log error for debugging

### Input Validation Rules

#### Question Topics & Packages
- **ids**: Array of positive integers
- **Minimum**: 1 item
- **Maximum**: 100 items
- **Example**: `{"ids": [1, 2, 3]}`

#### Question Details
- **items**: Array of objects with questionId and questionPackageId
- **questionId**: Positive integer
- **questionPackageId**: Positive integer
- **Minimum**: 1 item
- **Maximum**: 100 items
- **Example**: `{"items": [{"questionId": 1, "questionPackageId": 10}]}`

## cURL Testing Examples

### Question Topics Batch Delete
```bash
curl -X POST http://localhost:3000/api/question-topics/batch-delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "ids": [1, 2, 3]
  }'
```

### Question Packages Batch Delete
```bash
curl -X POST http://localhost:3000/api/question-packages/batch-delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "ids": [10, 20, 30]
  }'
```

### Question Details Batch Delete
```bash
curl -X POST http://localhost:3000/api/question-details/batch-delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "items": [
      {
        "questionId": 1,
        "questionPackageId": 10
      },
      {
        "questionId": 2,
        "questionPackageId": 20
      }
    ]
  }'
```

### PowerShell Examples
```powershell
# Question Topics
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_JWT_TOKEN"
}

$body = @{
    ids = @(1, 2, 3)
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/question-topics/batch-delete" `
                  -Method POST `
                  -Headers $headers `
                  -Body $body

# Question Packages
$body = @{
    ids = @(10, 20, 30)
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/question-packages/batch-delete" `
                  -Method POST `
                  -Headers $headers `
                  -Body $body

# Question Details
$body = @{
    items = @(
        @{ questionId = 1; questionPackageId = 10 },
        @{ questionId = 2; questionPackageId = 20 }
    )
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:3000/api/question-details/batch-delete" `
                  -Method POST `
                  -Headers $headers `                  -Body $body
```

## Postman Collection Example

### Environment Variables
Create a Postman environment with:
- `baseUrl`: `http://localhost:3000`
- `authToken`: Your JWT token

### Question Topics Batch Delete
```json
{
  "info": {
    "name": "Question Topics Batch Delete",
    "description": "Delete multiple question topics"
  },
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Content-Type",
        "value": "application/json"
      },
      {
        "key": "Authorization",
        "value": "Bearer {{authToken}}"
      }
    ],
    "url": {
      "raw": "{{baseUrl}}/api/question-topics/batch-delete",
      "host": ["{{baseUrl}}"],
      "path": ["api", "question-topics", "batch-delete"]
    },
    "body": {
      "mode": "raw",
      "raw": "{\n  \"ids\": [1, 2, 3, 4, 5]\n}"
    }
  }
}
```

### Question Packages Batch Delete
```json
{
  "info": {
    "name": "Question Packages Batch Delete",
    "description": "Delete multiple question packages"
  },
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Content-Type",
        "value": "application/json"
      },
      {
        "key": "Authorization",
        "value": "Bearer {{authToken}}"
      }
    ],
    "url": {
      "raw": "{{baseUrl}}/api/question-packages/batch-delete",
      "host": ["{{baseUrl}}"],
      "path": ["api", "question-packages", "batch-delete"]
    },
    "body": {
      "mode": "raw",
      "raw": "{\n  \"ids\": [10, 20, 30]\n}"
    }
  }
}
```

### Question Details Batch Delete
```json
{
  "info": {
    "name": "Question Details Batch Delete",
    "description": "Delete multiple question details"
  },
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Content-Type",
        "value": "application/json"
      },
      {
        "key": "Authorization",
        "value": "Bearer {{authToken}}"
      }
    ],
    "url": {
      "raw": "{{baseUrl}}/api/question-details/batch-delete",
      "host": ["{{baseUrl}}"],
      "path": ["api", "question-details", "batch-delete"]
    },
    "body": {
      "mode": "raw",
      "raw": "{\n  \"items\": [\n    {\n      \"questionId\": 1,\n      \"questionPackageId\": 10\n    },\n    {\n      \"questionId\": 2,\n      \"questionPackageId\": 10\n    },\n    {\n      \"questionId\": 3,\n      \"questionPackageId\": 20\n    }\n  ]\n}"
    }
  }
}
```

## Response Status Codes

| Status Code | Description | Example Scenario |
|-------------|-------------|------------------|
| **200** | Success | All items deleted successfully or partial success with detailed results |
| **400** | Bad Request | Invalid input data, validation errors |
| **401** | Unauthorized | Missing or invalid authentication token |
| **403** | Forbidden | User doesn't have required permissions |
| **500** | Internal Server Error | Database connection issues, unexpected server errors |

## Common Error Scenarios & Troubleshooting

### 1. Validation Errors (400)

#### Empty IDs Array
```json
// Request
{
  "ids": []
}

// Response
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "field": "ids", 
    "message": "Phải cung cấp ít nhất một ID"
  }
}
```

#### Too Many Items
```json
// Request with 101 items
{
  "ids": [1, 2, 3, ..., 101]
}

// Response
{
  "success": false,
  "message": "Validation failed", 
  "error": {
    "field": "ids",
    "message": "Không thể xóa quá 100 mục cùng lúc"
  }
}
```

#### Invalid Item Format (Question Details)
```json
// Request
{
  "items": [
    {
      "questionId": "invalid",
      "questionPackageId": -1
    }
  ]
}

// Response
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "field": "items[0].questionId",
    "message": "ID câu hỏi phải là số nguyên dương"
  }
}
```

### 2. Business Rule Violations

#### Cannot Delete Topics with Active Questions
```json
// Response when trying to delete topic with questions
{
  "success": true,
  "message": "Batch delete completed with some failures",
  "data": {
    "totalRequested": 2,
    "successful": 1,
    "failed": 1,
    "successfulItems": [{ "id": 2 }],
    "failedItems": [
      {
        "id": 1,
        "reason": "Không thể xóa chủ đề này vì đang có câu hỏi sử dụng"
      }
    ]
  }
}
```

#### Cannot Delete Packages Used in Matches
```json
// Response when trying to delete package used in active matches
{
  "success": true,
  "message": "Batch delete completed with some failures",
  "data": {
    "totalRequested": 1,
    "successful": 0,
    "failed": 1,
    "successfulItems": [],
    "failedItems": [
      {
        "id": 10,
        "reason": "Không thể xóa gói câu hỏi này vì đang được sử dụng trong trận đấu"
      }
    ]
  }
}
```

### 3. Authentication Issues

#### Missing Token
```json
// Response when no Authorization header
{
  "success": false,
  "message": "Access token is required"
}
```

#### Invalid Token
```json
// Response when token is malformed or expired
{
  "success": false,
  "message": "Vui lòng đăng nhập lại"
}
```

#### Insufficient Permissions
```json
// Response when user role doesn't have access
{
  "success": false,
  "message": "Không có quyền truy cập"
}
```

### 4. Troubleshooting Tips

#### Getting Authentication Token
1. **Login first**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "identifier": "admin",
       "password": "admin@123"
     }'
   ```

2. **Extract token from response**:
   ```json
   {
     "success": true,
     "message": "Đăng nhập thành công"
   }
   ```
   
   Token is set in HTTP-only cookie, or use the returned access token.

#### Checking Item Existence
Before batch delete, verify items exist:
```bash
# Check question topic
curl -X GET http://localhost:3000/api/question-topics/1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check question package  
curl -X GET http://localhost:3000/api/question-packages/10 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check question detail
curl -X GET http://localhost:3000/api/question-details?questionId=1&questionPackageId=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Database Constraints
1. **Question Topics**: Check if any questions reference this topic
2. **Question Packages**: Check if any question details or matches use this package
3. **Question Details**: Check if any contestant matches use this detail

#### Performance Considerations
- Maximum batch size: 100 items
- Use smaller batches for better performance
- Monitor database connections during large operations
- Consider rate limiting for production environments

## Safety Features

### 1. Input Validation
- Minimum 1 item, maximum 100 items per request
- Positive integer validation for all IDs
- Proper error messages in Vietnamese

### 2. Business Logic Protection
- Referential integrity checks before deletion
- Prevents deletion of items with active dependencies
- Graceful handling of non-existent items

### 3. Partial Failure Handling
- Individual item processing prevents complete operation failure
- Detailed reporting of which items succeeded/failed and why
- Client can make informed decisions about retry logic

### 4. Audit Trail
- Comprehensive logging of batch operations
- Maintains data integrity with soft deletes
- Preserves relationships for potential recovery

## HTTP Status Codes

The batch delete API now returns different HTTP status codes based on the operation results:

### 200 OK - Complete Success
**When**: All items were deleted successfully  
**Response**: 
```json
{
  "success": true,
  "message": "Xóa hàng loạt thành công: 5/5 mục đã được xóa",
  "data": {
    "totalRequested": 5,
    "successful": 5,
    "failed": 0,
    "successfulItems": [...],
    "failedItems": []
  }
}
```

### 207 Multi-Status - Partial Success  
**When**: Some items succeeded, some failed  
**Response**:
```json
{
  "success": true,
  "message": "Xóa hàng loạt hoàn tất một phần: 3/5 thành công, 2 thất bại",
  "data": {
    "totalRequested": 5,
    "successful": 3,
    "failed": 2,
    "successfulItems": [...],
    "failedItems": [
      {
        "questionId": 2,
        "questionPackageId": 10,
        "reason": "Không thể xóa chi tiết câu hỏi đang được sử dụng trong trận đấu đang hoạt động"
      }
    ]
  }
}
```

### 400 Bad Request - Complete Failure
**When**: All items failed due to validation or business logic errors  
**Response**:
```json
{
  "success": false,
  "message": "Xóa hàng loạt thất bại: 3/3 mục không thể xóa",
  "data": {
    "totalRequested": 3,
    "successful": 0,
    "failed": 3,
    "successfulItems": [],
    "failedItems": [...]
  }
}
```

### 401/403 - Authentication/Authorization Errors
Standard authentication and authorization error responses.

### 500 Internal Server Error
**When**: Unexpected server errors occur during processing  
**Response**: Standard error format with error details.

### Status Code Logic
```
if (failed === 0) → 200 OK (Complete Success)
else if (successful === 0) → 400 Bad Request (Complete Failure)  
else → 207 Multi-Status (Partial Success)
```

## Testing

Use the provided PowerShell script (`scripts/test-batch-delete.ps1`) to test all batch delete endpoints:

```powershell
# Run from project root
.\scripts\test-batch-delete.ps1
```

**Note**: Update the `$authToken` variable with a valid JWT token before testing.

## Database Impact

All batch delete operations:
- Perform **soft deletes** (`isActive = false`)
- Preserve referential integrity
- Maintain audit trail with timestamps
- Support potential data recovery operations

## Performance Considerations

- Maximum batch size limited to 100 items
- Individual processing prevents long-running transactions
- Efficient database queries with proper indexing
- Minimal memory footprint with streaming processing

## Error Handling

Comprehensive error handling includes:
- Input validation errors (400)
- Authentication/authorization errors (401/403)
- Business rule violations (detailed in response)
- Database connection issues (500)
- Partial failure scenarios (200 with detailed results)

## Future Enhancements

Potential improvements:
1. **Background Processing**: For very large batch operations
2. **Progress Tracking**: Real-time status updates for large batches
3. **Batch Restore**: Ability to undo batch delete operations
4. **Advanced Filters**: Batch delete with conditions/filters
5. **Rate Limiting**: Prevent abuse of batch operations

## Conclusion

The batch delete functionality provides a robust, safe, and efficient way to manage bulk deletions across the question management system while maintaining data integrity and providing detailed feedback on operations.

# Question Detail API Documentation

## Overview
The Question Detail API manages the relationship between questions and question packages. It provides comprehensive CRUD operations, bulk operations, and advanced features like reordering and statistics.

## Base URL
```
http://localhost:3000/api/question-details
```

## Database Schema
The Question Detail module manages relationships with a composite primary key:
```prisma
model QuestionDetail {
  questionId        Int             
  questionPackageId Int             
  question          Question        @relation(fields: [questionId], references: [id])
  questionPackage   QuestionPackage @relation(fields: [questionPackageId], references: [id])
  questionOrder     Int            
  isActive         Boolean        
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@id([questionId, questionPackageId])
  @@map("Question_Details")
}
```

## API Endpoints

### 1. Create Question Detail
**POST** `/api/question-details`

Creates a new relationship between a question and a question package.

**Request Body:**
```json
{
  "questionId": 1,
  "questionPackageId": 1,
  "questionOrder": 1,
  "isActive": true
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Thêm câu hỏi vào gói thành công",
  "data": {
    "questionId": 1,
    "questionPackageId": 1,
    "questionOrder": 1,
    "isActive": true,
    "createdAt": "2025-06-07T09:00:00.000Z",
    "updatedAt": "2025-06-07T09:00:00.000Z"
  },
  "timestamp": "2025-06-07T09:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid input data
- `404`: Question or question package not found
- `409`: Question already exists in package or order already taken

### 2. Get Question Details (List with Pagination)
**GET** `/api/question-details`

Retrieves question details with pagination, filtering, and search capabilities.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)
- `questionId` (number, optional): Filter by question ID
- `questionPackageId` (number, optional): Filter by question package ID
- `isActive` (boolean, optional): Filter by active status
- `search` (string, optional): Search in question content

**Response (200):**
```json
{
  "success": true,
  "message": "Lấy danh sách chi tiết câu hỏi thành công",
  "data": {
    "questionDetails": [
      {
        "questionId": 1,
        "questionPackageId": 1,
        "questionOrder": 1,
        "isActive": true,
        "createdAt": "2025-06-07T09:00:00.000Z",
        "updatedAt": "2025-06-07T09:00:00.000Z",
        "question": {
          "id": 1,
          "title": "Sample Question"
        },
        "questionPackage": {
          "id": 1,
          "name": "Sample Package"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  },
  "timestamp": "2025-06-07T09:00:00.000Z"
}
```

### 3. Get Question Detail by Composite Key
**GET** `/api/question-details/{questionId}/{questionPackageId}`

Retrieves a specific question detail by its composite primary key.

**Path Parameters:**
- `questionId` (number): The question ID
- `questionPackageId` (number): The question package ID

**Response (200):**
```json
{
  "success": true,
  "message": "Lấy chi tiết câu hỏi thành công",
  "data": {
    "questionId": 1,
    "questionPackageId": 1,
    "questionOrder": 1,
    "isActive": true,
    "createdAt": "2025-06-07T09:00:00.000Z",
    "updatedAt": "2025-06-07T09:00:00.000Z",
    "question": {
      "id": 1,
      "title": "Sample Question",
      "content": "Question content here"
    },
    "questionPackage": {
      "id": 1,
      "name": "Sample Package",
      "description": "Package description"
    }
  },
  "timestamp": "2025-06-07T09:00:00.000Z"
}
```

### 4. Update Question Detail
**PUT** `/api/question-details/{questionId}/{questionPackageId}`

Updates an existing question detail relationship.

**Path Parameters:**
- `questionId` (number): The question ID
- `questionPackageId` (number): The question package ID

**Request Body:**
```json
{
  "questionOrder": 2,
  "isActive": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Cập nhật chi tiết câu hỏi thành công",
  "data": {
    "questionId": 1,
    "questionPackageId": 1,
    "questionOrder": 2,
    "isActive": false,
    "createdAt": "2025-06-07T09:00:00.000Z",
    "updatedAt": "2025-06-07T09:01:00.000Z"
  },
  "timestamp": "2025-06-07T09:01:00.000Z"
}
```

### 5. Delete Question Detail (Soft Delete)
**DELETE** `/api/question-details/{questionId}/{questionPackageId}`

Soft deletes a question detail relationship by setting isActive to false.

**Path Parameters:**
- `questionId` (number): The question ID
- `questionPackageId` (number): The question package ID

**Response (200):**
```json
{
  "success": true,
  "message": "Xóa mềm chi tiết câu hỏi thành công",
  "data": {
    "questionId": 1,
    "questionPackageId": 1,
    "questionOrder": 1,
    "isActive": false,
    "createdAt": "2025-06-07T09:00:00.000Z",
    "updatedAt": "2025-06-07T09:02:00.000Z"
  },
  "timestamp": "2025-06-07T09:02:00.000Z"
}
```

### 6. Delete Question Detail (Hard Delete)
**DELETE** `/api/question-details/{questionId}/{questionPackageId}/hard`

Permanently removes a question detail relationship from the database.

**Path Parameters:**
- `questionId` (number): The question ID
- `questionPackageId` (number): The question package ID

**Response (200):**
```json
{
  "success": true,
  "message": "Xóa cứng chi tiết câu hỏi thành công",
  "timestamp": "2025-06-07T09:03:00.000Z"
}
```

### 7. Bulk Create Question Details
**POST** `/api/question-details/bulk`

Creates multiple question detail relationships in a single request.

**Request Body:**
```json
{
  "questionDetails": [
    {
      "questionId": 1,
      "questionPackageId": 1,
      "questionOrder": 1,
      "isActive": true
    },
    {
      "questionId": 2,
      "questionPackageId": 1,
      "questionOrder": 2,
      "isActive": true
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Tạo hàng loạt chi tiết câu hỏi thành công",
  "data": {
    "created": [
      {
        "questionId": 1,
        "questionPackageId": 1,
        "questionOrder": 1,
        "isActive": true,
        "createdAt": "2025-06-07T09:00:00.000Z",
        "updatedAt": "2025-06-07T09:00:00.000Z"
      },
      {
        "questionId": 2,
        "questionPackageId": 1,
        "questionOrder": 2,
        "isActive": true,
        "createdAt": "2025-06-07T09:00:00.000Z",
        "updatedAt": "2025-06-07T09:00:00.000Z"
      }
    ],
    "summary": {
      "totalRequested": 2,
      "successful": 2,
      "failed": 0
    }
  },
  "timestamp": "2025-06-07T09:00:00.000Z"
}
```

### 8. Reorder Questions in Package
**PUT** `/api/question-details/reorder`

Updates the order of multiple questions within a package.

**Request Body:**
```json
{
  "questionPackageId": 1,
  "questionOrders": [
    {
      "questionId": 1,
      "questionOrder": 3
    },
    {
      "questionId": 2,
      "questionOrder": 1
    },
    {
      "questionId": 3,
      "questionOrder": 2
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Sắp xếp lại thứ tự câu hỏi thành công",
  "data": {
    "updated": [
      {
        "questionId": 1,
        "questionPackageId": 1,
        "questionOrder": 3,
        "isActive": true,
        "updatedAt": "2025-06-07T09:05:00.000Z"
      },
      {
        "questionId": 2,
        "questionPackageId": 1,
        "questionOrder": 1,
        "isActive": true,
        "updatedAt": "2025-06-07T09:05:00.000Z"
      }
    ],
    "summary": {
      "totalRequested": 3,
      "successful": 2,
      "failed": 1
    }
  },
  "timestamp": "2025-06-07T09:05:00.000Z"
}
```

### 9. Get Questions by Package (Enhanced with Advanced Filtering)
**GET** `/api/question-details/package/{packageId}`

Retrieves all questions associated with a specific package with advanced filtering, pagination, search, and sorting capabilities.

**Path Parameters:**
- `packageId` (number): The question package ID

**Query Parameters:**
- `page` (number, optional): Page number (default: 1, minimum: 1)
- `limit` (number, optional): Items per page (default: 10, maximum: 100)
- `includeInactive` (boolean, optional): Include inactive questions (default: false)
- `search` (string, optional): Search within question text
- `questionType` (string, optional): Filter by question type - "multiple_choice", "essay"
- `difficulty` (string, optional): Filter by difficulty level - "Alpha", "Beta", "Rc", "Gold"
- `isActive` (boolean, optional): Filter by active status - true/false
- `sortBy` (string, optional): Sort field - "questionOrder", "createdAt", "updatedAt", "difficulty", "questionType" (default: "questionOrder")
- `sortOrder` (string, optional): Sort direction - "asc", "desc" (default: "asc")

**Example Requests:**

1. Basic request with pagination:
```bash
GET /api/question-details/package/1?page=1&limit=5&search=toán&sortBy=questionOrder&sortOrder=asc
```

2. Filter by question type:
```bash
GET /api/question-details/package/1?questionType=multiple_choice&page=1&limit=10
```

3. Filter by difficulty:
```bash
GET /api/question-details/package/1?difficulty=Easy&sortBy=difficulty&sortOrder=desc
```

4. Combined filters:
```bash
GET /api/question-details/package/1?questionType=multiple_choice&difficulty=Easy&isActive=true&page=1&limit=5
```

5. Search with filters:
```bash
GET /api/question-details/package/1?search=toán&questionType=multiple_choice&difficulty=Medium
```

**Response (200):**
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
          "difficulty": "Easy"
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
    "total": 15,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "totalQuestions": 50,
    "filteredQuestions": 15,
    "appliedFilters": {
      "questionType": "multiple_choice",
      "difficulty": "Easy",
      "isActive": true
    }
  },
  "timestamp": "2025-06-10T10:00:00.000Z"
}
```

**Filter Information:**
The response now includes comprehensive filter information:
- `filters.totalQuestions`: Total number of questions in the package (without filters)
- `filters.filteredQuestions`: Number of questions after applying filters
- `filters.appliedFilters`: Object showing which filters were applied

**Filter Combinations:**
- All filters can be combined for precise results
- Filters are applied cumulatively (AND logic)
- Search works across all filtered results
- Sorting can be applied to both filtered and unfiltered results

**Question Type Values:**
- `multiple_choice`: Multiple choice questions
- `essay`: Essay questions

**Difficulty Values:**
- `Alpha`, `Beta`, `Rc`, `Gold`: Database-defined difficulty levels

### 10. Get Packages by Question (Enhanced with Pagination)
**GET** `/api/question-details/question/{questionId}`

Retrieves all packages that contain a specific question with pagination, search, and sorting capabilities.

**Path Parameters:**
- `questionId` (number): The question ID

**Query Parameters:**
- `page` (number, optional): Page number (default: 1, minimum: 1)
- `limit` (number, optional): Items per page (default: 10, maximum: 100)
- `includeInactive` (boolean, optional): Include inactive packages (default: false)
- `search` (string, optional): Search within package names
- `sortBy` (string, optional): Sort field - "questionOrder", "createdAt", "updatedAt" (default: "questionOrder")
- `sortOrder` (string, optional): Sort direction - "asc", "desc" (default: "asc")

**Example Request:**
```bash
GET /api/question-details/question/1?page=1&limit=10&search=gói&includeInactive=false
```
- `questionId` (number): The question ID

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)
- `isActive` (boolean, optional): Filter by active status

**Response (200):**
```json
{
  "success": true,
  "message": "Lấy danh sách gói theo câu hỏi thành công",
  "data": {
    "questionInfo": {
      "id": 1,
      "title": "Sample Question",
      "content": "Question content"
    },
    "packages": [
      {
        "questionPackageId": 1,
        "questionOrder": 1,
        "isActive": true,
        "questionPackage": {
          "id": 1,
          "name": "Package 1",
          "description": "Package description"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 3,
      "itemsPerPage": 10
    }
  },
  "timestamp": "2025-06-07T09:00:00.000Z"
}
```

### 11. Get Question Detail Statistics
**GET** `/api/question-details/stats`

Retrieves statistics about question details in the system.

**Query Parameters:**
- `questionPackageId` (number, optional): Filter stats by specific package

**Response (200):**
```json
{
  "success": true,
  "message": "Lấy thống kê chi tiết câu hỏi thành công",
  "data": {
    "overview": {
      "totalQuestionDetails": 150,
      "activeQuestionDetails": 135,
      "inactiveQuestionDetails": 15,
      "totalQuestions": 50,
      "totalPackages": 10
    },
    "packageStats": [
      {
        "questionPackageId": 1,
        "packageName": "Package 1",
        "totalQuestions": 15,
        "activeQuestions": 14,
        "inactiveQuestions": 1
      }
    ],
    "questionStats": [
      {
        "questionId": 1,
        "questionTitle": "Question 1",
        "totalPackages": 3,
        "activeInPackages": 3,
        "inactiveInPackages": 0
      }
    ]
  },
  "timestamp": "2025-06-07T09:00:00.000Z"
}
```
## 12. Get Statistics by Package
**GET** `/api/question-details/stats?questionPackageId={{questionPackageId}}`

## 13. Get Question Details with Filters
**GET** `/api/question-details?questionPackageId={{questionPackageId}}&isActive=true&page=1&limit=5`

## Error Responses

All endpoints return consistent error responses:

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "type": "VALIDATION_ERROR",
    "details": [
      {
        "field": "questionId",
        "message": "questionId must be a positive integer"
      }
    ]
  },
  "timestamp": "2025-06-07T09:00:00.000Z"
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "message": "Không tìm thấy chi tiết câu hỏi",
  "error": {
    "code": "RECORD_NOT_FOUND",
    "details": "Không tìm thấy chi tiết câu hỏi"
  },
  "timestamp": "2025-06-07T09:00:00.000Z"
}
```

### Duplicate Entry Error (409)
```json
{
  "success": false,
  "message": "Câu hỏi đã tồn tại trong gói câu hỏi này",
  "error": {
    "code": "DUPLICATE_ENTRY",
    "details": "Câu hỏi đã tồn tại trong gói câu hỏi này"
  },
  "timestamp": "2025-06-07T09:00:00.000Z"
}
```

### Internal Server Error (500)
```json
{
  "success": false,
  "message": "Lỗi server nội bộ",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "details": "Đã xảy ra lỗi không mong muốn"
  },
  "timestamp": "2025-06-07T09:00:00.000Z"
}
```

## 📊 API Response Examples
### List with Pagination
```json
{
  "success": true,
  "message": "Lấy danh sách chi tiết câu hỏi thành công",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 189,
    "totalPages": 38,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Statistics Response
```json
{
  "success": true,
  "message": "Lấy thống kê chi tiết câu hỏi thành công",
  "data": {
    "totalQuestionDetails": 189,
    "activeQuestionDetails": 189,
    "uniqueQuestions": 30,
    "uniquePackages": 13,
    "averageQuestionsPerPackage": 14.54
  }
}
```

### Validation Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "type": "VALIDATION_ERROR",
    "details": [
      {
        "field": "questionId",
        "message": "ID câu hỏi phải là số nguyên dương"
      }
    ]
  }
}
```

## Business Rules

1. **Composite Primary Key**: Each question can only be associated with a package once
2. **Question Order**: Must be unique within each package
3. **Soft Delete**: Default delete operation sets `isActive` to false
4. **Hard Delete**: Permanently removes the relationship
5. **Bulk Operations**: Support batch creation and reordering
6. **Validation**: All inputs are validated using Zod schemas
7. **Pagination**: All list endpoints support pagination
8. **Search**: Search functionality across question content
9. **Statistics**: Comprehensive stats for monitoring and analytics

## Testing Recommendations

1. Test composite key constraints
2. Test duplicate prevention (question-package and order conflicts)
3. Test bulk operations with mixed success/failure scenarios
4. Test pagination edge cases
5. Test search functionality
6. Test soft vs hard delete operations
7. Test reordering with conflicts
8. Test invalid ID parameters
9. Test statistics accuracy
10. Test relationship integrity (foreign key constraints)

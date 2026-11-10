# Question Package API Documentation

## Overview
The Question Package API provides complete CRUD operations for managing question packages in the contest system. Question packages are collections of questions used in contests/matches.

## Base URL
```
http://localhost:3000/api/question-packages
```

## Endpoints

### 1. Get All Question Packages
**GET** `/api/question-packages`

Get a paginated list of question packages with optional filtering and sorting.

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 10 | Number of items per page (max 100) |
| `search` | string | - | Search by package name |
| `isActive` | boolean | - | Filter by active status |
| `sortBy` | string | "createdAt" | Sort field: "name", "createdAt", "updatedAt" |
| `sortOrder` | string | "desc" | Sort order: "asc" or "desc" |

#### Example Request
```bash
GET /api/question-packages?page=1&limit=5&search=gói&sortBy=name&sortOrder=asc
```

#### Example Response
```json
{
  "success": true,
  "message": "Lấy danh sách gói câu hỏi thành công",
  "data": [
    {
      "id": 1,
      "name": "Gói câu hỏi Bán kết",
      "isActive": true,
      "questionDetailsCount": 15,
      "matchesCount": 5,
      "createdAt": "2025-06-04T16:48:03.000Z",
      "updatedAt": "2025-06-04T16:48:03.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 10,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2025-06-07T00:45:00.000Z"
}
```

---

### 2. Get Question Package by ID
**GET** `/api/question-packages/:id`

Get detailed information about a specific question package including related questions and matches.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Question package ID |

#### Example Request
```bash
GET /api/question-packages/1
```

#### Example Response
```json
{
  "success": true,
  "message": "Lấy thông tin gói câu hỏi thành công",
  "data": {
    "id": 1,
    "name": "Gói câu hỏi Bán kết",
    "isActive": true,
    "questionDetailsCount": 15,
    "matchesCount": 5,
    "createdAt": "2025-06-04T16:48:03.000Z",
    "updatedAt": "2025-06-04T16:48:03.000Z",
    "questionDetails": [
      {
        "questionOrder": 1,
        "isActive": true,
        "question": {
          "id": 101,
          "plainText": "Câu hỏi về khoa học",
          "questionType": "multiple_choice",
          "difficulty": "Alpha"
        }
      }
    ],
    "matches": [
      {
        "id": 201,
        "name": "Trận bán kết 1",
        "startTime": "2025-06-10T10:00:00.000Z",
        "endTime": "2025-06-10T12:00:00.000Z"
      }
    ]
  },
  "timestamp": "2025-06-07T00:45:00.000Z"
}
```

#### Error Response (404)
```json
{
  "success": false,
  "message": "Không tìm thấy gói câu hỏi",
  "error": {
    "code": "QUESTION_PACKAGE_NOT_FOUND",
    "details": "Question package with ID 999 not found"
  },
  "timestamp": "2025-06-07T00:45:00.000Z"
}
```

---

### 3. Create Question Package
**POST** `/api/question-packages`

Create a new question package.

#### Request Body
```json
{
  "name": "Gói câu hỏi mới",
  "isActive": true //optional
}
```

#### Request Body Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Package name (3-255 characters) |
| `isActive` | boolean | No | Active status (default: true) |

#### Example Request
```bash
POST /api/question-packages
Content-Type: application/json

{
  "name": "Gói câu hỏi Vòng loại",
  "isActive": true
}
```

#### Example Response (201)
```json
{
  "success": true,
  "message": "Tạo gói câu hỏi thành công",
  "data": {
    "id": 16,
    "name": "Gói câu hỏi Vòng loại",
    "isActive": true,
    "createdAt": "2025-06-07T00:45:00.000Z",
    "updatedAt": "2025-06-07T00:45:00.000Z"
  },
  "timestamp": "2025-06-07T00:45:00.000Z"
}
```

#### Error Response (400) - Validation Error
```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "name",
        "message": "Tên gói câu hỏi phải có ít nhất 3 ký tự"
      }
    ]
  },
  "timestamp": "2025-06-07T00:45:00.000Z"
}
```

#### Error Response (409) - Name Already Exists
```json
{
  "success": false,
  "message": "Tên gói câu hỏi đã tồn tại",
  "error": {
    "code": "QUESTION_PACKAGE_NAME_EXISTS",
    "details": "A question package with this name already exists"
  },
  "timestamp": "2025-06-07T00:45:00.000Z"
}
```

---

### 4. Update Question Package
**PUT** `/api/question-packages/:id`

Update an existing question package.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Question package ID |

#### Request Body
```json
{
  "name": "Tên gói câu hỏi đã cập nhật", // optional
  "isActive": false // optional
}
```

#### Request Body Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Package name (3-255 characters) |
| `isActive` | boolean | No | Active status |

#### Example Request
```bash
PUT /api/question-packages/16
Content-Type: application/json

{
  "name": "Gói câu hỏi Vòng loại - Cập nhật",
  "isActive": false
}
```

#### Example Response (200)
```json
{
  "success": true,
  "message": "Cập nhật gói câu hỏi thành công",
  "data": {
    "id": 16,
    "name": "Gói câu hỏi Vòng loại - Cập nhật",
    "isActive": false,
    "createdAt": "2025-06-07T00:45:00.000Z",
    "updatedAt": "2025-06-07T00:46:00.000Z"
  },
  "timestamp": "2025-06-07T00:46:00.000Z"
}
```

#### Error Response (404)
```json
{
  "success": false,
  "message": "Không tìm thấy gói câu hỏi",
  "error": {
    "code": "QUESTION_PACKAGE_NOT_FOUND",
    "details": "Question package with ID 999 not found"
  },
  "timestamp": "2025-06-07T00:46:00.000Z"
}
```

---

### 5. Delete Question Package (Soft Delete)
**DELETE** `/api/question-packages/:id`

Soft delete a question package by setting `isActive` to `false`.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Question package ID |

#### Example Request
```bash
DELETE /api/question-packages/16
```

#### Example Response (200)
```json
{
  "success": true,
  "message": "Xóa gói câu hỏi thành công",
  "data": null,
  "timestamp": "2025-06-07T00:46:00.000Z"
}
```

#### Error Response (404)
```json
{
  "success": false,
  "message": "Không tìm thấy gói câu hỏi",
  "error": {
    "code": "QUESTION_PACKAGE_NOT_FOUND",
    "details": "Question package with ID 999 not found"
  },
  "timestamp": "2025-06-07T00:46:00.000Z"
}
```

---

### 6. Get Active Question Packages
**GET** `/api/question-packages/active`

Get a simple list of active question packages (for dropdowns/selects).

#### Example Request
```bash
GET /api/question-packages/active
```

#### Example Response
```json
{
  "success": true,
  "message": "Lấy danh sách gói câu hỏi hoạt động thành công",
  "data": [
    {
      "id": 1,
      "name": "Gói câu hỏi Bán kết"
    },
    {
      "id": 2,
      "name": "Gói câu hỏi Chung kết"
    }
  ],
  "timestamp": "2025-06-07T00:46:00.000Z"
}

```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request data validation failed |
| `QUESTION_PACKAGE_NOT_FOUND` | 404 | Question package not found |
| `QUESTION_PACKAGE_NAME_EXISTS` | 409 | Question package name already exists |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## Common Error Response Format

```json
{
  "success": false,
  "message": "Error message in Vietnamese",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  },
  "timestamp": "2025-06-07T00:46:00.000Z"
}
```

---

## Testing Examples

### Using cURL (Linux/Mac)
```bash
# Get all question packages
curl -X GET "http://localhost:3000/api/question-packages"

# Create a new question package
curl -X POST "http://localhost:3000/api/question-packages" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Package","isActive":true}'

# Update a question package
curl -X PUT "http://localhost:3000/api/question-packages/1" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Package"}'

# Delete a question package
curl -X DELETE "http://localhost:3000/api/question-packages/1"
```

### Using PowerShell (Windows)
```powershell
# Get all question packages
Invoke-WebRequest -Uri "http://localhost:3000/api/question-packages" -Method GET

# Create a new question package
$body = '{"name":"Test Package","isActive":true}'
Invoke-WebRequest -Uri "http://localhost:3000/api/question-packages" -Method POST -Body $body -ContentType "application/json"

# Update a question package
$body = '{"name":"Updated Package"}'
Invoke-WebRequest -Uri "http://localhost:3000/api/question-packages/1" -Method PUT -Body $body -ContentType "application/json"

# Delete a question package
Invoke-WebRequest -Uri "http://localhost:3000/api/question-packages/1" -Method DELETE
```

---

## Notes

1. **Soft Delete**: The delete operation sets `isActive` to `false` instead of permanently removing the record.
2. **Pagination**: Default pagination is 10 items per page with a maximum of 100 items per page.
3. **Search**: Search functionality works on the question package name field using partial matching.
4. **Sorting**: Available sort fields are `name`, `createdAt`, and `updatedAt`.
5. **Validation**: All input validation is performed using Zod schemas with Vietnamese error messages.
6. **Relationships**: Question packages are related to questions through `QuestionDetail` and to `Match` records.

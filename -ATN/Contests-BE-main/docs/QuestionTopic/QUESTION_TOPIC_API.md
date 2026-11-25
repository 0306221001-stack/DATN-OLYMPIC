# Question Topic API Documentation

## Overview
This document describes the Question Topic Management API endpoints for the Contest Backend system.

## Base URL
```
http://localhost:3000/api/question-topics
```

## Authentication
All endpoints require authentication. Include the Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Create Question Topic
**POST** `/api/question-topics`

Creates a new question topic.

**Request Body:**
```json
{
  "name": "Topic Name",           // Required
  "isActive": true|false         // Optional (defaults to true)
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Tạo chủ đề câu hỏi thành công",
  "data": {
    "id": 1,
    "name": "Toán học cơ bản",
    "isActive": true,
    "createdAt": "2025-06-06T10:30:00.000Z",
    "updatedAt": "2025-06-06T10:30:00.000Z"
  },
  "timestamp": "2025-06-06T10:30:00.000Z"
}
```

**Error Response (409 Conflict):**
```json
{
  "success": false,
  "message": "Tên chủ đề đã tồn tại",
  "error": "DUPLICATE_ENTRY",
  "timestamp": "2025-06-06T10:30:00.000Z"
}
```

### 2. Get All Question Topics
**GET** `/api/question-topics`

Retrieves all question topics with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search by name
- `isActive` (optional): Filter by active status (true/false)
- `sortBy` (optional): Sort field (name, createdAt, updatedAt) (default: createdAt)
- `sortOrder` (optional): Sort order (asc, desc) (default: desc)

**Example Request:**
```
GET /api/question-topics?page=1&limit=10&search=toán&isActive=true&sortBy=name&sortOrder=asc
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Lấy danh sách chủ đề câu hỏi thành công",
  "data": [
    {
      "id": 1,
      "name": "Toán học cơ bản",
      "isActive": true,
      "questionsCount": 25,
      "createdAt": "2025-06-06T10:30:00.000Z",
      "updatedAt": "2025-06-06T10:30:00.000Z"
    },
    {
      "id": 2,
      "name": "Toán học nâng cao",
      "isActive": true,
      "questionsCount": 18,
      "createdAt": "2025-06-06T10:35:00.000Z",
      "updatedAt": "2025-06-06T10:35:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "timestamp": "2025-06-06T10:30:00.000Z"
}
```

### 3. Get Active Question Topics
**GET** `/api/question-topics/active`

Retrieves all active question topics for dropdown/select components.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Lấy danh sách chủ đề câu hỏi hoạt động thành công",
  "data": [
    {
      "id": 1,
      "name": "Toán học cơ bản"
    },
    {
      "id": 2,
      "name": "Toán học nâng cao"
    },
    {
      "id": 3,
      "name": "Vật lý"
    }
  ],
  "timestamp": "2025-06-06T10:30:00.000Z"
}
```

### 4. Get Question Topic by ID
**GET** `/api/question-topics/:id`

Retrieves a specific question topic with detailed information including related questions.

**Path Parameters:**
- `id`: Question topic ID (integer)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Lấy thông tin chủ đề câu hỏi thành công",
  "data": {
    "id": 1,
    "name": "Toán học cơ bản",
    "isActive": true,
    "questionsCount": 25,
    "createdAt": "2025-06-06T10:30:00.000Z",
    "updatedAt": "2025-06-06T10:30:00.000Z",
    "questions": [
      {
        "id": 1,
        "plainText": "2 + 2 = ?",
        "questionType": "multiple_choice",
        "difficulty": "Alpha"
      },
      {
        "id": 2,
        "plainText": "Tìm x trong phương trình x + 5 = 10",
        "questionType": "multiple_choice",
        "difficulty": "Beta"
      }
    ]
  },
  "timestamp": "2025-06-06T10:30:00.000Z"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Không tìm thấy chủ đề câu hỏi",
  "error": "RECORD_NOT_FOUND",
  "timestamp": "2025-06-06T10:30:00.000Z"
}
```

### 5. Update Question Topic
**PUT** `/api/question-topics/:id`

Updates an existing question topic.

**Path Parameters:**
- `id`: Question topic ID (integer)

**Request Body:**
```json
{
  "name": "New Topic Name",      // Optional
  "isActive": true|false         // Optional
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Cập nhật chủ đề câu hỏi thành công",
  "data": {
    "id": 1,
    "name": "Toán học cập nhật",
    "isActive": false,
    "createdAt": "2025-06-06T10:30:00.000Z",
    "updatedAt": "2025-06-06T11:00:00.000Z"
  },
  "timestamp": "2025-06-06T11:00:00.000Z"
}
```

### 6. Delete Question Topic
**DELETE** `/api/question-topics/:id`

Soft deletes a question topic (sets isActive to false).

**Path Parameters:**
- `id`: Question topic ID (integer)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Xóa chủ đề câu hỏi thành công",
  "data": null,
  "timestamp": "2025-06-06T11:00:00.000Z"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `DUPLICATE_ENTRY` | Resource already exists |
| `RECORD_NOT_FOUND` | Resource not found |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Access denied |
| `INTERNAL_SERVER_ERROR` | Server error |

## Validation Rules

### Create Question Topic
- `name`: Required, 3-255 characters, trimmed

### Update Question Topic
- `name`: Optional, 3-255 characters, trimmed
- `isActive`: Optional, boolean

### Query Parameters
- `page`: Optional, positive integer (default: 1)
- `limit`: Optional, positive integer, max 100 (default: 10)
- `search`: Optional, string
- `isActive`: Optional, boolean
- `sortBy`: Optional, enum: "name", "createdAt", "updatedAt"
- `sortOrder`: Optional, enum: "asc", "desc"

## Testing Examples

### Using cURL

1. **Create Question Topic:**
```bash
curl -X POST http://localhost:3000/api/question-topics \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Toán học cơ bản"}'
```

2. **Get All Question Topics:**
```bash
curl -X GET "http://localhost:3000/api/question-topics?page=1&limit=10" \
  -H "Authorization: Bearer <your-token>"
```

3. **Get Question Topic by ID:**
```bash
curl -X GET http://localhost:3000/api/question-topics/1 \
  -H "Authorization: Bearer <your-token>"
```

4. **Update Question Topic:**
```bash
curl -X PUT http://localhost:3000/api/question-topics/1 \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Toán học nâng cao", "isActive": true}'
```

5. **Delete Question Topic:**
```bash
curl -X DELETE http://localhost:3000/api/question-topics/1 \
  -H "Authorization: Bearer <your-token>"
```

### Using PowerShell (Windows)

1. **Create Question Topic:**
```powershell
$headers = @{ 
    "Authorization" = "Bearer <your-token>"
    "Content-Type" = "application/json"
}
$body = @{
    name = "Toán học cơ bản"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/question-topics" -Method POST -Headers $headers -Body $body
```

2. **Get All Question Topics:**
```powershell
$headers = @{ "Authorization" = "Bearer <your-token>" }
Invoke-RestMethod -Uri "http://localhost:3000/api/question-topics?page=1&limit=10" -Method GET -Headers $headers
```
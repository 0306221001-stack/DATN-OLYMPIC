# Award API Documentation

## Overview
The Award API provides CRUD operations for managing contest awards with proper validation and authentication.

## Base URL
```
/api/awards
```

## Endpoints

### 1. Get All Awards
**GET** `/api/awards`

Query Parameters:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `contestId` (optional): Filter by contest ID
- `type` (optional): Filter by award type
- `search` (optional): Search in award name
- `hasContestant` (optional): Filter by contestant assignment (true/false)

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách giải thưởng thành công",
  "data": {
    "awards": [
      {
        "id": 1,
        "name": "Giải Nhất",
        "contestId": 1,
        "contestantId": 123,
        "type": "firstPrize",
        "createdAt": "2025-06-14T03:00:00.000Z",
        "updatedAt": "2025-06-14T03:00:00.000Z",
        "contest": {
          "id": 1,
          "name": "Contest Name",
          "slug": "contest-slug"
        },
        "contestant": {
          "id": 123,
          "name": "Contestant Name",
          "student": {
            "id": 456,
            "fullName": "Student Full Name",
            "studentCode": "STU001"
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 2. Get Award by ID
**GET** `/api/awards/:id`

**Response:**
```json
{
  "success": true,
  "message": "Lấy thông tin giải thưởng thành công",
  "data": {
    "id": 1,
    "name": "Giải Nhất",
    "contestId": 1,
    "contestantId": 123,
    "type": "firstPrize",
    "createdAt": "2025-06-14T03:00:00.000Z",
    "updatedAt": "2025-06-14T03:00:00.000Z",
    "contest": {
      "id": 1,
      "name": "Contest Name",
      "slug": "contest-slug"
    },
    "contestant": {
      "id": 123,
      "name": "Contestant Name",
      "student": {
        "id": 456,
        "fullName": "Student Full Name",
        "studentCode": "STU001"
      }
    }
  }
}
```

### 3. Create Award
**POST** `/api/awards`
**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "name": "Giải Nhất",
  "contestId": 1,
  "contestantId": 123, // optional
  "type": "firstPrize"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tạo giải thưởng thành công",
  "data": {
    "id": 1,
    "name": "Giải Nhất",
    "contestId": 1,
    "contestantId": 123,
    "type": "firstPrize",
    "createdAt": "2025-06-14T03:00:00.000Z",
    "updatedAt": "2025-06-14T03:00:00.000Z",
    "contest": {
      "id": 1,
      "name": "Contest Name",
      "slug": "contest-slug"
    },
    "contestant": {
      "id": 123,
      "name": "Contestant Name",
      "student": {
        "id": 456,
        "fullName": "Student Full Name",
        "studentCode": "STU001"
      }
    }
  }
}
```

### 4. Update Award
**PATCH** `/api/awards/:id`
**Authentication:** Required (Admin only)

**Request Body (all fields optional):**
```json
{
  "name": "Updated Award Name",
  "contestId": 2,
  "contestantId": 456,
  "type": "secondPrize"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cập nhật giải thưởng thành công",
  "data": {
    "id": 1,
    "name": "Updated Award Name",
    "contestId": 2,
    "contestantId": 456,
    "type": "secondPrize",
    "createdAt": "2025-06-14T03:00:00.000Z",
    "updatedAt": "2025-06-14T03:30:00.000Z",
    "contest": {
      "id": 2,
      "name": "New Contest Name",
      "slug": "new-contest-slug"
    },
    "contestant": {
      "id": 456,
      "name": "New Contestant Name",
      "student": {
        "id": 789,
        "fullName": "New Student Full Name",
        "studentCode": "STU002"
      }
    }
  }
}
```

### 5. Delete Award
**DELETE** `/api/awards/:id`
**Authentication:** Required (Admin only)

**Response:**
```json
{
  "success": true,
  "message": "Xóa giải thưởng thành công",
  "data": null
}
```

### 6. Batch Delete Awards
**DELETE** `/api/awards/batch`
**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "ids": [1, 2, 3, 4, 5]
}
```

**Validation Rules:**
- `ids` must be an array of positive integers
- Minimum 1 ID, maximum 100 IDs per request
- Each ID must be a positive integer

**Response (All Success):**
```json
{
  "success": true,
  "message": "Xóa thành công 5 giải thưởng",
  "data": {
    "successIds": [1, 2, 3, 4, 5],
    "failedIds": [],
    "errors": []
  }
}
```

**Response (Partial Success - HTTP 207):**
```json
{
  "success": true,
  "message": "Xóa thành công 3/5 giải thưởng",
  "data": {
    "successIds": [1, 3, 5],
    "failedIds": [2, 4],
    "errors": [
      {
        "id": 2,
        "error": "Giải thưởng với ID 2 không tồn tại"
      },
      {
        "id": 4,
        "error": "Database constraint violation"
      }
    ]
  }
}
```

**Response (All Failed - HTTP 400):**
```json
{
  "success": false,
  "message": "Không thể xóa bất kỳ giải thưởng nào",
  "error": {
    "result": {
      "successIds": [],
      "failedIds": [1, 2, 3],
      "errors": [
        {
          "id": 1,
          "error": "Giải thưởng với ID 1 không tồn tại"
        },
        {
          "id": 2,
          "error": "Giải thưởng với ID 2 không tồn tại"
        },
        {
          "id": 3,
          "error": "Giải thưởng với ID 3 không tồn tại"
        }
      ]
    },
    "errors": [...]
  }
}
```

## Award Types
Available award types (AwardType enum):
- `firstPrize` - Giải Nhất
- `secondPrize` - Giải Nhì  
- `thirdPrize` - Giải Ba
- `fourthPrize` - Giải Tư
- `impressiveVideo` - Video ấn tượng
- `excellentVideo` - Video xuất sắc

## Error Responses

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "type": "VALIDATION_ERROR",
    "details": [
      {
        "field": "name",
        "message": "Tên giải thưởng không được để trống"
      }
    ]
  }
}
```

### Not Found Error
```json
{
  "success": false,
  "message": "Giải thưởng không tồn tại",
  "error": "AWARD_NOT_FOUND"
}
```

### Duplicate Award Type Error
```json
{
  "success": false,
  "message": "Loại giải thưởng này đã tồn tại cho cuộc thi",
  "error": "AWARD_TYPE_EXISTS"
}
```

### Authentication Error
```json
{
  "success": false,
  "message": "Unauthorized access",
  "error": "UNAUTHORIZED"
}
```

## Business Rules

1. **Unique Award Type per Contest:** Each contest can only have one award of each type
2. **Contest Validation:** Contest must exist when creating/updating awards
3. **Contestant Validation:** Contestant must exist when assigning to awards
4. **Award Type Uniqueness:** When updating contestId or type, system checks for duplicates
5. **Partial Updates:** PATCH method allows updating individual fields without affecting others

## PATCH Method Flexibility

The Award API's PATCH method is designed to be highly flexible, allowing you to update any combination of fields without affecting others. Here are various update scenarios:

### 1. Update Single Field

#### Update Name Only
```bash
curl -X PATCH http://localhost:3000/api/awards/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Giải Thưởng Mới"
  }'
```

#### Update Contest ID Only
```bash
curl -X PATCH http://localhost:3000/api/awards/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contestId": 2
  }'
```

#### Assign Contestant
```bash
curl -X PATCH http://localhost:3000/api/awards/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contestantId": 123
  }'
```

#### Unassign Contestant (set to null)
```bash
curl -X PATCH http://localhost:3000/api/awards/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contestantId": null
  }'
```

#### Change Award Type
```bash
curl -X PATCH http://localhost:3000/api/awards/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "secondPrize"
  }'
```

### 2. Update Multiple Fields

#### Update Name and Type
```bash
curl -X PATCH http://localhost:3000/api/awards/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Giải Nhì Cuộc Thi ABC",
    "type": "secondPrize"
  }'
```

#### Transfer Award to Different Contest with New Contestant
```bash
curl -X PATCH http://localhost:3000/api/awards/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contestId": 3,
    "contestantId": 456,
    "name": "Giải Thưởng Chuyển Contest"
  }'
```

#### Complete Award Information Update
```bash
curl -X PATCH http://localhost:3000/api/awards/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Giải Nhất Cuộc Thi XYZ",
    "contestId": 2,
    "contestantId": 789,
    "type": "firstPrize"
  }'
```

### 3. Validation Rules

#### Empty Body (Invalid)
```bash
# This will fail validation
curl -X PATCH http://localhost:3000/api/awards/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{}'
```

**Error Response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "type": "VALIDATION_ERROR",
    "details": [
      {
        "field": "body",
        "message": "Ít nhất một trường cần được cập nhật"
      }
    ]
  }
}
```

### 4. Flexible Update Benefits

✅ **Granular Control**: Update only the fields you need
✅ **Efficient**: No need to send unchanged data
✅ **Safe**: Preserves existing data for non-updated fields
✅ **Flexible Assignment**: Can assign/unassign contestants easily
✅ **Contest Transfer**: Can move awards between contests
✅ **Type Changes**: Can change award types with validation
✅ **Validation**: Ensures at least one field is updated

## Usage Examples

### Create a First Prize Award
```bash
curl -X POST http://localhost:3000/api/awards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Giải Nhất Cuộc Thi ABC",
    "contestId": 1,
    "type": "firstPrize"
  }'
```

### Update Award to Assign Contestant
```bash
curl -X PATCH http://localhost:3000/api/awards/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "contestantId": 123
  }'
```

### Search Awards by Name
```bash
curl "http://localhost:3000/api/awards?search=giải&page=1&limit=10"
```

### Filter Awards by Contest
```bash
curl "http://localhost:3000/api/awards?contestId=1&hasContestant=false"
```

### Batch Delete Awards
```bash
curl -X DELETE http://localhost:3000/api/awards/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "ids": [1, 2, 3, 4, 5]
  }'
```

**Batch Delete Features:**
- ✅ **Bulk Operations**: Delete up to 100 awards in one request
- ✅ **Partial Success Handling**: Continue processing even if some deletions fail
- ✅ **Detailed Error Reporting**: Get specific error for each failed deletion
- ✅ **Status Code Variety**: 200 (all success), 207 (partial), 400 (all failed)
- ✅ **Transaction Safety**: Each deletion is independent
- ✅ **Comprehensive Logging**: Track all batch operations

## Contest-Specific Endpoints

### 7. Create Award by Contest Slug
**POST** `/api/awards/contest/:slug`
**Authentication:** Required (Admin only)

**Parameters:**
- `slug` (path): Contest slug

**Request Body:**
```json
{
  "name": "Giải Nhất Cuộc Thi ABC",
  "contestantId": 123,
  "type": "firstPrize"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tạo giải thưởng thành công",
  "data": {
    "id": 1,
    "name": "Giải Nhất Cuộc Thi ABC",
    "contestId": 5,
    "contestantId": 123,
    "type": "firstPrize",
    "createdAt": "2025-06-14T03:00:00.000Z",
    "updatedAt": "2025-06-14T03:00:00.000Z",
    "contest": {
      "id": 5,
      "name": "Cuộc Thi ABC",
      "slug": "contest-abc-2025"
    },
    "contestant": {
      "id": 123,
      "name": "Contestant Name",
      "student": {
        "id": 456,
        "fullName": "Student Full Name",
        "studentCode": "STU001"
      }
    }
  }
}
```

### 8. Get Awards by Contest Slug
**GET** `/api/awards/contest/:slug`

**Parameters:**
- `slug` (path): Contest slug

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách giải thưởng thành công",
  "data": [
    {
      "id": 1,
      "name": "Giải Nhất",
      "contestId": 5,
      "contestantId": 123,
      "type": "firstPrize",
      "createdAt": "2025-06-14T03:00:00.000Z",
      "updatedAt": "2025-06-14T03:00:00.000Z",
      "contest": {
        "id": 5,
        "name": "Cuộc Thi ABC",
        "slug": "contest-abc-2025"
      },
      "contestant": {
        "id": 123,
        "name": "Contestant Name",
        "student": {
          "id": 456,
          "fullName": "Student Full Name",
          "studentCode": "STU001"
        }
      }
    }
  ]
}
```

### Contest-Specific Operations

#### Create Award for Specific Contest
```bash
curl -X POST http://localhost:3000/api/awards/contest/contest-abc-2025 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Giải Nhất Cuộc Thi ABC",
    "type": "firstPrize",
    "contestantId": 123
  }'
```

#### Get All Awards for Specific Contest
```bash
curl "http://localhost:3000/api/awards/contest/contest-abc-2025"
```

**Contest Slug Features:**
- ✅ **Auto Contest Lookup**: Automatically finds contest by slug
- ✅ **Simplified Creation**: No need to specify contestId manually
- ✅ **Contest Validation**: Ensures contest exists before creating award
- ✅ **Organized by Contest**: Easy to get all awards for specific contest
- ✅ **SEO Friendly**: Uses readable slugs instead of numeric IDs

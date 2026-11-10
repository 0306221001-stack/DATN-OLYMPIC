# 📊 Result Module - Complete API Documentation

## 📋 **Table of Contents**
1. [Overview](#overview)
2. [Data Structure](#data-structure)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Examples](#request-response-examples)
5. [Error Handling](#error-handling)
6. [Testing Examples](#testing-examples)
7. [Best Practices](#best-practices)

---

## 🎯 **Overview**

Result module quản lý kết quả thi của contestants trong từng match với các tính năng:

### **Core Features:**
- ✅ **CRUD Operations**: Create, Read, Update (PATCH), Hard Delete
- ✅ **Batch Delete**: Xóa nhiều kết quả cùng lúc
- ✅ **Search & Filter**: Tìm kiếm và lọc theo nhiều tiêu chí
- ✅ **Pagination**: Phân trang hiệu quả
- ✅ **Statistics**: Thống kê kết quả theo contestant
- ✅ **Grouping**: Lấy kết quả theo contestant hoặc match
- ✅ **Validation**: Kiểm tra duplicate và foreign key constraints

### **Base URL:**
```
http://localhost:3000/api/results
```

### **Authentication:**
- **Required**: JWT token trong header Authorization
- **Permissions**: Admin/Judge cho read operations, Admin cho delete operations

---

## 📊 **Data Structure**

### **Result Object Structure:**
```typescript
interface Result {
  id: number;                        // Primary key
  name: string;                      // Result name/description
  contestantId: number;              // Foreign key to Contestant
  matchId: number;                   // Foreign key to Match
  isCorrect: boolean;                // Whether answer is correct
  questionOrder: number;             // Order of question in match
  createdAt: string;                 // ISO date string
  updatedAt: string;                 // ISO date string
  
  // Related data (when included)
  contestant?: {
    id: number;
    name: string;
    studentId: number;
    student?: {
      id: number;
      fullName: string;
      studentCode: string | null;
    };
  };
  match?: {
    id: number;
    name: string;
    roundId: number;
    round?: {
      id: number;
      name: string;
    };
  };
}
```

### **Business Rules:**
- **Unique Constraint**: Combination of (contestantId, matchId, questionOrder) must be unique
- **Foreign Keys**: contestantId and matchId must exist in their respective tables
- **Question Order**: Must be positive integer (1, 2, 3, ...)
- **Name**: Required, max 255 characters

---

## 🚀 **API Endpoints**

### **1. GET /api/results - List Results**
```
GET /api/results?page=1&limit=10&contestantId=1&isCorrect=true
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max 100) |
| `search` | string | - | Tìm kiếm theo tên kết quả, tên thí sinh hoặc mã thí sinh |
| `contestantId` | number | - | Filter by contestant |
| `matchId` | number | - | Filter by match |
| `isCorrect` | boolean | - | Filter by correctness |
| `questionOrder` | number | - | Filter by question order |
| `sortBy` | enum | createdAt | `createdAt` \| `updatedAt` \| `name` \| `questionOrder` |
| `sortOrder` | enum | desc | `asc` \| `desc` |

### **2. GET /api/results/:id - Get Result**
```
GET /api/results/1
```

### **3. POST /api/results - Create Result**
```
POST /api/results
Content-Type: application/json
```

### **4. PATCH /api/results/:id - Update Result**
```
PATCH /api/results/1
Content-Type: application/json
```

### **5. DELETE /api/results/:id - Hard Delete**
```
DELETE /api/results/1
```

### **6. DELETE /api/results/batch - Batch Delete**
```
DELETE /api/results/batch
Content-Type: application/json
```

### **7. GET /api/results/contestant/:contestantId - Get by Contestant**
```
GET /api/results/contestant/1
```

### **8. GET /api/results/match/:matchId - Get by Match**
```
GET /api/results/match/1
```

### **9. GET /api/results/contestant/:contestantId/statistics - Get Statistics**
```
GET /api/results/contestant/1/statistics
```

### **10. GET /api/results/contest/:slug - Get Results by Contest Slug**
```
GET /api/results/contest/olympic-toan-2024?page=1&limit=10
```

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số lượng mỗi trang (default: 10, max: 100)
- `search` (optional): Từ khóa tìm kiếm theo tên thí sinh hoặc mã thí sinh
- `matchId` (optional): ID trận đấu
- `roundId` (optional): ID vòng thi
- `isCorrect` (optional): true/false - lọc theo đúng/sai
- `questionOrder` (optional): Thứ tự câu hỏi
- `sortBy` (optional): Sắp xếp theo (createdAt, updatedAt, name, questionOrder, contestant)
- `sortOrder` (optional): Thứ tự sắp xếp (asc, desc)

**Request Example:**
```javascript
// Lấy tất cả kết quả của cuộc thi:
// GET /api/results/contest/olympic-toan-2024?page=1&limit=10

// Tìm kiếm theo tên thí sinh trong cuộc thi:
// GET /api/results/contest/olympic-toan-2024?search=Nguyễn Văn A&page=1&limit=10

// Lọc theo vòng thi:
// GET /api/results/contest/olympic-toan-2024?roundId=1&page=1&limit=10

// Lọc theo trận đấu:
// GET /api/results/contest/olympic-toan-2024?matchId=1&page=1&limit=10

// Sắp xếp theo tên thí sinh:
// GET /api/results/contest/olympic-toan-2024?sortBy=contestant&sortOrder=asc
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách kết quả theo cuộc thi thành công",
  "data": {
    "results": [
      {
        "id": 1,
        "name": "Result Name",
        "contestantId": 1,
        "matchId": 1,
        "isCorrect": true,
        "questionOrder": 1,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "contestant": {
          "id": 1,
          "studentId": 1,
          "student": {
            "id": 1,
            "fullName": "Nguyễn Văn A",
            "studentCode": "SV001"
          }
        },
        "match": {
          "id": 1,
          "name": "Match Name",
          "roundId": 1,
          "round": {
            "id": 1,
            "name": "Round Name"
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Cuộc thi không tồn tại",
  "code": "CONTEST_NOT_FOUND"
}
```

---

## 💡 **Request/Response Examples**

### **📝 Create Result**

**Request:**
```javascript
// POST /api/results
// Headers: Authorization: Bearer <token>
// Content-Type: application/json

{
  "name": "Question 1 - Multiple Choice Answer",
  "contestantId": 5,
  "matchId": 3,
  "isCorrect": true,
  "questionOrder": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tạo kết quả thành công",
  "data": {
    "id": 15,
    "name": "Question 1 - Multiple Choice Answer",
    "contestantId": 5,
    "matchId": 3,
    "isCorrect": true,
    "questionOrder": 1,
    "createdAt": "2025-06-15T10:30:45.123Z",
    "updatedAt": "2025-06-15T10:30:45.123Z",
    "contestant": {
      "id": 5,
      "name": "Contestant Alpha",
      "studentId": 10,
      "student": {
        "id": 10,
        "fullName": "Nguyễn Văn A",
        "studentCode": "SV001"
      }
    },
    "match": {
      "id": 3,
      "name": "Vòng Chung Kết",
      "roundId": 2,
      "round": {
        "id": 2,
        "name": "Round Final"
      }
    }
  },
  "timestamp": "2025-06-15T10:30:45.123Z"
}
```

### **📊 Get Results with Pagination**

**Request:**
```javascript
// GET /api/results?page=1&limit=5&contestantId=5&sortBy=questionOrder&sortOrder=asc
// Hoặc tìm kiếm theo tên thí sinh:
// GET /api/results?search=Nguyễn Văn A&page=1&limit=10
// Hoặc tìm kiếm theo mã thí sinh:
// GET /api/results?search=SV001&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách kết quả thành công",
  "data": {
    "results": [
      {
        "id": 15,
        "name": "Question 1 - Multiple Choice Answer",
        "contestantId": 5,
        "matchId": 3,
        "isCorrect": true,
        "questionOrder": 1,
        "createdAt": "2025-06-15T10:30:45.123Z",
        "updatedAt": "2025-06-15T10:30:45.123Z",
        "contestant": {
          "id": 5,
          "name": "Contestant Alpha",
          "studentId": 10
        },
        "match": {
          "id": 3,
          "name": "Vòng Chung Kết",
          "roundId": 2
        }
      },
      {
        "id": 16,
        "name": "Question 2 - Essay Answer",
        "contestantId": 5,
        "matchId": 3,
        "isCorrect": false,
        "questionOrder": 2,
        "createdAt": "2025-06-15T10:32:15.456Z",
        "updatedAt": "2025-06-15T10:32:15.456Z",
        "contestant": {
          "id": 5,
          "name": "Contestant Alpha",
          "studentId": 10
        },
        "match": {
          "id": 3,
          "name": "Vòng Chung Kết",
          "roundId": 2
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 8,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "2025-06-15T10:35:20.789Z"
}
```

### **✏️ Update Result (PATCH)**

**Request:**
```javascript
// PATCH /api/results/15
// Content-Type: application/json

{
  "name": "Question 1 - Updated Answer",
  "isCorrect": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cập nhật kết quả thành công",
  "data": {
    "id": 15,
    "name": "Question 1 - Updated Answer",
    "contestantId": 5,
    "matchId": 3,
    "isCorrect": false,
    "questionOrder": 1,
    "createdAt": "2025-06-15T10:30:45.123Z",
    "updatedAt": "2025-06-15T10:40:30.456Z",
    "contestant": {
      "id": 5,
      "name": "Contestant Alpha",
      "studentId": 10,
      "student": {
        "id": 10,
        "fullName": "Nguyễn Văn A",
        "studentCode": "SV001"
      }
    },
    "match": {
      "id": 3,
      "name": "Vòng Chung Kết",
      "roundId": 2,
      "round": {
        "id": 2,
        "name": "Round Final"
      }
    }
  },
  "timestamp": "2025-06-15T10:40:30.456Z"
}
```

### **📈 Get Contestant Statistics**

**Request:**
```javascript
// GET /api/results/contestant/5/statistics
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy thống kê contestant thành công",
  "data": {
    "totalQuestions": 10,
    "correctAnswers": 7,
    "incorrectAnswers": 3,
    "accuracy": 70.0
  },
  "timestamp": "2025-06-15T10:45:15.123Z"
}
```

### **🗑️ Batch Delete Results**

**Request:**
```javascript
// DELETE /api/results/batch
// Content-Type: application/json

{
  "ids": [20, 21, 22, 23, 24]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch delete hoàn thành: 4/5 thành công, 1 thất bại",
  "data": {
    "successIds": [20, 21, 22, 24],
    "failedIds": [23],
    "errors": [
      {
        "id": 23,
        "error": "Result not found"
      }
    ],
    "summary": {
      "total": 5,
      "success": 4,
      "failed": 1
    }
  },
  "timestamp": "2025-06-15T10:50:30.789Z"
}
```

### **👥 Get Results by Match**

**Request:**
```javascript
// GET /api/results/match/3
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy kết quả theo match thành công",
  "data": [
    {
      "id": 15,
      "name": "Question 1 - Updated Answer",
      "contestantId": 5,
      "matchId": 3,
      "isCorrect": false,
      "questionOrder": 1,
      "createdAt": "2025-06-15T10:30:45.123Z",
      "updatedAt": "2025-06-15T10:40:30.456Z",
      "contestant": {
        "id": 5,
        "name": "Contestant Alpha",
        "studentId": 10
      },
      "match": {
        "id": 3,
        "name": "Vòng Chung Kết",
        "roundId": 2
      }
    },
    {
      "id": 25,
      "name": "Question 1 - Answer B",
      "contestantId": 6,
      "matchId": 3,
      "isCorrect": true,
      "questionOrder": 1,
      "createdAt": "2025-06-15T10:31:20.789Z",
      "updatedAt": "2025-06-15T10:31:20.789Z",
      "contestant": {
        "id": 6,
        "name": "Contestant Beta",
        "studentId": 11
      },
      "match": {
        "id": 3,
        "name": "Vòng Chung Kết",
        "roundId": 2
      }
    }
  ],
  "timestamp": "2025-06-15T10:55:45.123Z"
}
```

---

## ❌ **Error Handling**

### **Error Response Format:**
```json
{
  "success": false,
  "message": "Human readable error message",
  "error": {
    "code": "ERROR_CODE"
  },
  "timestamp": "2025-06-15T11:00:30.789Z"
}
```

### **Common Error Codes:**

#### **🔍 Validation Errors (400)**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR"
  },
  "timestamp": "2025-06-15T11:00:30.789Z"
}
```

**Common validation errors:**
- Name: "Tên kết quả không được để trống", "Tên kết quả không được quá 255 ký tự"
- ContestantId: "Contestant ID phải là số dương"
- MatchId: "Match ID phải là số dương" 
- QuestionOrder: "Question order phải là số dương"

#### **🚫 Not Found (404)**
```json
{
  "success": false,
  "message": "Kết quả không tìm thấy",
  "error": {
    "code": "RESULT_NOT_FOUND"
  },
  "timestamp": "2025-06-15T11:00:30.789Z"
}
```

#### **⚠️ Duplicate Entry (409)**
```json
{
  "success": false,
  "message": "Kết quả đã tồn tại cho contestant, match và question order này",
  "error": {
    "code": "RESULT_ALREADY_EXISTS"
  },
  "timestamp": "2025-06-15T11:00:30.789Z"
}
```

#### **🔐 Authentication Errors (401)**
```json
{
  "success": false,
  "message": "Access token is required",
  "error": {
    "code": "UNAUTHORIZED"
  },
  "timestamp": "2025-06-15T11:00:30.789Z"
}
```

#### **⛔ Permission Errors (403)**
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "error": {
    "code": "FORBIDDEN"
  },
  "timestamp": "2025-06-15T11:00:30.789Z"
}
```

### **Field Validation Rules:**

| Field | Rules | Error Messages |
|-------|-------|----------------|
| `name` | required, max 255 chars | "Tên kết quả không được để trống", "Tên kết quả không được quá 255 ký tự" |
| `contestantId` | positive integer, exists | "Contestant ID phải là số dương", "Contestant không tồn tại" |
| `matchId` | positive integer, exists | "Match ID phải là số dương", "Match không tồn tại" |
| `isCorrect` | boolean | Auto-converted from string |
| `questionOrder` | positive integer | "Question order phải là số dương" |
| `unique constraint` | (contestantId, matchId, questionOrder) | "Kết quả đã tồn tại cho contestant, match và question order này" |

---

## 🧪 **Testing Examples**

### **📋 Postman Collection Structure:**

```
📁 Result API Testing
├── 🔧 Setup & Health Check
│   ├── POST Login (get token)
│   ├── GET Health Check
│   └── GET List Contestants & Matches (for IDs)
├── 📋 Basic CRUD Operations
│   ├── GET List Results
│   ├── POST Create Result
│   ├── GET Result Details
│   ├── PATCH Update Result
│   └── DELETE Hard Delete
├── 🔍 Search & Filter Tests
│   ├── GET Search by Name
│   ├── GET Filter by Contestant
│   ├── GET Filter by Match
│   ├── GET Filter by Correctness
│   └── GET Complex Filters
├── 📊 Statistics & Grouping
│   ├── GET Results by Contestant
│   ├── GET Results by Match
│   └── GET Contestant Statistics
├── 🗂️ Batch Operations
│   └── DELETE Batch Delete
└── ❌ Error & Validation Tests
    ├── POST Invalid Data
    ├── POST Duplicate Entry
    └── DELETE Non-existent Result
```

### **🔧 Environment Variables:**
```json
{
  "baseUrl": "http://localhost:3000/api",
  "authToken": "",
  "resultId": "",
  "lastCreatedId": "",
  "contestantId": "5",
  "matchId": "3"
}
```

### **📊 Test Scripts (Postman):**

**Auto-save Result ID:**
```javascript
// Add to Tests tab of POST create result
if (pm.response.code === 201) {
    const response = pm.response.json();
    if (response.success && response.data.id) {
        pm.environment.set('resultId', response.data.id);
        pm.environment.set('lastCreatedId', response.data.id);
    }
}

// Validate response structure
pm.test("Response has success true", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
});

pm.test("Response has result data", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property('id');
    pm.expect(jsonData.data).to.have.property('name');
    pm.expect(jsonData.data).to.have.property('contestantId');
    pm.expect(jsonData.data).to.have.property('matchId');
    pm.expect(jsonData.data).to.have.property('isCorrect');
    pm.expect(jsonData.data).to.have.property('questionOrder');
});
```

**Validate Statistics:**
```javascript
// Add to Tests tab of GET statistics
pm.test("Statistics has all fields", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property('totalQuestions');
    pm.expect(jsonData.data).to.have.property('correctAnswers');
    pm.expect(jsonData.data).to.have.property('incorrectAnswers');
    pm.expect(jsonData.data).to.have.property('accuracy');
    
    // Validate accuracy calculation
    const { totalQuestions, correctAnswers, accuracy } = jsonData.data;
    if (totalQuestions > 0) {
        const expectedAccuracy = (correctAnswers / totalQuestions) * 100;
        pm.expect(accuracy).to.be.closeTo(expectedAccuracy, 0.01);
    }
});
```

### **🎯 Test Data Examples:**

**Valid Test Data:**
```javascript
// Create Result
const validResult = {
    "name": "Question 5 - Mathematics Answer",
    "contestantId": 5,
    "matchId": 3,
    "isCorrect": true,
    "questionOrder": 5
};

// Update Result
const updateResult = {
    "name": "Updated Question Name",
    "isCorrect": false
};

// Batch Delete
const batchDelete = {
    "ids": [1, 2, 3, 4, 5]
};
```

**Invalid Test Data:**
```javascript
// Missing required fields
const missingFields = {
    "contestantId": 5
    // Missing name, matchId, questionOrder
};

// Invalid values
const invalidValues = {
    "name": "", // Empty name
    "contestantId": -1, // Negative ID
    "matchId": 0, // Zero ID
    "questionOrder": -5 // Negative order
};

// Duplicate entry
const duplicateEntry = {
    "name": "Duplicate Test",
    "contestantId": 5,
    "matchId": 3,
    "questionOrder": 1 // Same combination as existing
};
```

---

## ✅ **Best Practices**

### **🔧 Frontend Implementation:**

1. **Error Handling:**
```javascript
// Always handle both network and API errors
try {
  const response = await fetch('/api/results', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(resultData)
  });
  
  const result = await response.json();
  
  if (!result.success) {
    // Handle API errors
    showError(result.message);
    return;
  }
  
  // Handle success
  handleSuccess(result.data);
} catch (error) {
  // Handle network errors
  showError('Lỗi kết nối server');
}
```

2. **Validation Before Submit:**
```javascript
const validateResult = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim() === '') {
    errors.push('Tên kết quả không được để trống');
  }
  
  if (!data.contestantId || data.contestantId <= 0) {
    errors.push('Contestant ID phải là số dương');
  }
  
  if (!data.matchId || data.matchId <= 0) {
    errors.push('Match ID phải là số dương');
  }
  
  if (!data.questionOrder || data.questionOrder <= 0) {
    errors.push('Question order phải là số dương');
  }
  
  return errors;
};
```

3. **Pagination Component:**
```jsx
const ResultPagination = ({ pagination, onPageChange }) => {
  const { page, totalPages, hasNext, hasPrev } = pagination;
  
  return (
    <div className="pagination">
      <button 
        disabled={!hasPrev}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      
      <span className="page-info">
        Page {page} of {totalPages}
      </span>
      
      <button 
        disabled={!hasNext}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
};
```

4. **Statistics Display:**
```jsx
const ContestantStatistics = ({ statistics }) => {
  const { totalQuestions, correctAnswers, incorrectAnswers, accuracy } = statistics;
  
  return (
    <div className="statistics-card">
      <h3>Contestant Performance</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="label">Total Questions:</span>
          <span className="value">{totalQuestions}</span>
        </div>
        <div className="stat-item">
          <span className="label">Correct Answers:</span>
          <span className="value correct">{correctAnswers}</span>
        </div>
        <div className="stat-item">
          <span className="label">Incorrect Answers:</span>
          <span className="value incorrect">{incorrectAnswers}</span>
        </div>
        <div className="stat-item">
          <span className="label">Accuracy:</span>
          <span className="value accuracy">{accuracy}%</span>
        </div>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${accuracy}%` }}
        />
      </div>
    </div>
  );
};
```

### **🔒 Security Considerations:**

1. **Input Validation:**
   - Always validate contestant and match IDs exist
   - Check for duplicate entries before creation
   - Sanitize search input to prevent injection

2. **Permission Checks:**
   - Verify user has appropriate role (Admin/Judge)
   - Log all administrative actions
   - Implement rate limiting for API calls

3. **Data Integrity:**
   - Use transactions for batch operations
   - Validate foreign key constraints
   - Implement soft delete for audit trails (if needed in future)

### **🚀 Performance Optimization:**

1. **Database Indexing:**
```sql
-- Recommended indexes
CREATE INDEX idx_results_contestant ON Results(contestant_id);
CREATE INDEX idx_results_match ON Results(match_id);
CREATE INDEX idx_results_question_order ON Results(question_order);
CREATE INDEX idx_results_created_at ON Results(created_at);
```

2. **Caching Strategy:**
```javascript
// Cache frequently accessed statistics
const getCachedStatistics = async (contestantId) => {
  const cacheKey = `stats:contestant:${contestantId}`;
  let cached = await cache.get(cacheKey);
  
  if (!cached) {
    cached = await resultService.getContestantStatistics(contestantId);
    await cache.set(cacheKey, cached, 300); // 5 minutes TTL
  }
  
  return cached;
};
```

3. **Pagination Optimization:**
```javascript
// Use cursor-based pagination for large datasets
const getCursorPagination = async (cursor, limit = 10) => {
  const where = cursor ? { id: { gt: cursor } } : {};
  
  const results = await prisma.result.findMany({
    where,
    take: limit + 1, // Get one extra to check if there's next page
    orderBy: { id: 'asc' }
  });
  
  const hasNext = results.length > limit;
  if (hasNext) results.pop(); // Remove extra item
  
  return {
    results,
    hasNext,
    nextCursor: hasNext ? results[results.length - 1].id : null
  };
};
```

---

## 🎉 **Summary**

Result module cung cấp đầy đủ functionality để quản lý kết quả thi:

### **✅ Key Features:**
1. **Complete CRUD** với PATCH update
2. **Hard delete** và **batch delete**
3. **Advanced filtering** và search
4. **Statistics** và performance metrics
5. **Grouping** theo contestant/match
6. **Robust validation** và error handling
7. **Proper authentication** và authorization

### **📋 Key URLs:**
```
Base API: http://localhost:3000/api/results
List: GET /api/results
Create: POST /api/results
Update: PATCH /api/results/:id
Delete: DELETE /api/results/:id
Batch Delete: DELETE /api/results/batch
By Contestant: GET /api/results/contestant/:contestantId
By Match: GET /api/results/match/:matchId
Statistics: GET /api/results/contestant/:contestantId/statistics
```

**🎊 Result module đã sẵn sàng cho production với đầy đủ documentation và examples!**

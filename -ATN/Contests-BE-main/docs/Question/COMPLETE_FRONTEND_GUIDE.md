# 📚 Question Module - Complete Documentation for Frontend

## 📋 **Table of Contents**
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Data Structure](#data-structure)
4. [API Endpoints](#api-endpoints)
5. [Request/Response Examples](#request-response-examples)
6. [Error Handling](#error-handling)
7. [File Upload Guide](#file-upload-guide)
8. [Frontend Implementation](#frontend-implementation)
9. [Testing Examples](#testing-examples)
10. [Best Practices](#best-practices)

---

## 🎯 **Overview**

Question module quản lý tất cả câu hỏi trong hệ thống thi trắc nghiệm với các tính năng:

### **Core Features:**
- ✅ **CRUD Operations**: Create, Read, Update, Delete
- ✅ **Multiple Media Upload**: Images, Videos, Audio
- ✅ **Two Question Types**: Multiple Choice + Essay
- ✅ **Flexible Options**: Array strings hoặc objects
- ✅ **Search & Filter**: Tìm kiếm và lọc mạnh mẽ
- ✅ **Pagination**: Phân trang hiệu quả
- ✅ **Batch Operations**: Xóa nhiều câu hỏi cùng lúc
- ✅ **Soft/Hard Delete**: Xóa mềm và xóa cứng

### **Base URL:**
```
http://localhost:3000/api/questions
```

---

## 🔐 **Authentication**

### **Current Status: TEMPORARILY DISABLED**
Authentication hiện tại đang được disable để test. Khi enable:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json' // for JSON requests
  // Content-Type sẽ auto-set cho multipart/form-data
}
```

### **Permission Levels:**
- **Public**: GET operations (list, get by ID)
- **Admin/Judge**: Create, Update, Delete, Media upload
- **Admin only**: Hard delete, Batch operations

---

## 📊 **Data Structure**

### **Question Object Structure:**
```typescript
interface Question {
  id: number;                        // Primary key
  intro?: string;                    // Optional introduction
  defaultTime: number;               // Time limit (seconds)
  questionType: "multiple_choice" | "essay";
  content: string;                   // HTML content
  questionMedia?: MediaFile[];       // Question media files
  options?: string[] | null;         // Answer options (for multiple_choice)
  correctAnswer: string;             // Correct answer
  mediaAnswer?: MediaFile[];         // Answer explanation media
  score: number;                     // Points (1-100)
  difficulty: "Alpha" | "Beta" | "Rc" | "Gold";
  explanation?: string;              // Answer explanation
  questionTopicId: number;           // Foreign key
  isActive: boolean;                 // Active status
  createdAt: string;                 // ISO date string
  updatedAt: string;                 // ISO date string
  
  // Related data
  questionTopic?: {
    id: number;
    name: string;
  };
  questionDetails?: Array<{
    questionPackageId: number;
    questionOrder: number;
    questionPackage: {
      id: number;
      name: string;
    };
  }>;
}
```

### **Media File Structure:**
```typescript
interface MediaFile {
  type: "image" | "video" | "audio";
  url: string;                       // Relative URL: /uploads/questions/filename.ext
  filename: string;                  // Original filename with timestamp
  size: number;                      // File size in bytes
  mimeType: string;                  // MIME type
  duration?: number;                 // For video/audio (seconds)
  dimensions?: {                     // For images/videos
    width: number;
    height: number;
  };
}
```

### IMPORTANT: ONLY USE Simple String Array FOR options (MUST)
**Simple String Array (Recommended)**
```json
{
  "options": ["Option A", "Option B", "Option C", "Option D"]
}
```


---

## 🚀 **API Endpoints**

### **1. GET /api/questions - List Questions**
```
GET /api/questions?page=1&limit=10&search=math&questionType=multiple_choice
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max 100) |
| `search` | string | - | Search in content & explanation |
| `questionTopicId` | number | - | Filter by topic |
| `questionType` | enum | - | `multiple_choice` \| `essay` |
| `difficulty` | enum | - | `Alpha` \| `Beta` \| `Rc` \| `Gold` |
| `hasMedia` | boolean | - | Filter questions with/without media |
| `isActive` | boolean | - | Filter by active status |
| `sortBy` | enum | createdAt | `createdAt` \| `updatedAt` \| `defaultTime` \| `score` |
| `sortOrder` | enum | desc | `asc` \| `desc` |

### **2. GET /api/questions/:id - Get Question**
```
GET /api/questions/1
```

### **3. POST /api/questions - Create Question**
```
POST /api/questions
Content-Type: application/json (for simple create)
Content-Type: multipart/form-data (for create with files)
```

### **4. PATCH /api/questions/:id - Update Question**
```
PATCH /api/questions/1
Content-Type: application/json (for simple update)
Content-Type: multipart/form-data (for update with files)
```

### **5. PUT /api/questions/:id - Soft Delete**
```
PUT /api/questions/1
```

### **6. DELETE /api/questions/:id/hard - Hard Delete**
```
DELETE /api/questions/1/hard
```

### **7. DELETE /api/questions/batch - Batch Delete**
```
DELETE /api/questions/batch
Content-Type: application/json
```

### **8. POST /api/questions/:id/media - Upload Media**
```
POST /api/questions/1/media
Content-Type: multipart/form-data
```

---

## 💡 **Request/Response Examples**

### **📝 Create Multiple Choice Question (JSON)**

**Request:**
```javascript
// POST /api/questions
// Content-Type: application/json

{
  "intro": "Câu hỏi Toán học cơ bản",
  "defaultTime": 90,
  "questionType": "multiple_choice",
  "content": "<p><strong>Tính: 5 + 7 = ?</strong></p>",
  "options": ["10", "11", "12", "13"],
  "correctAnswer": "12",
  "score": 10,
  "difficulty": "Alpha",
  "explanation": "5 + 7 = 12 là phép cộng cơ bản",
  "questionTopicId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tạo câu hỏi thành công",
  "data": {
    "id": 45,
    "intro": "Câu hỏi Toán học cơ bản",
    "defaultTime": 90,
    "questionType": "multiple_choice",
    "content": "<p><strong>Tính: 5 + 7 = ?</strong></p>",
    "questionMedia": null,
    "options": ["10", "11", "12", "13"],
    "correctAnswer": "12",
    "mediaAnswer": null,
    "score": 10,
    "difficulty": "Alpha",
    "explanation": "5 + 7 = 12 là phép cộng cơ bản",
    "questionTopicId": 1,
    "isActive": true,
    "createdAt": "2025-06-14T15:30:45.123Z",
    "updatedAt": "2025-06-14T15:30:45.123Z",
    "questionTopic": {
      "id": 1,
      "name": "Toán học"
    }
  },
  "timestamp": "2025-06-14T15:30:45.123Z"
}
```

### **📝 Create Essay Question (JSON)**

**Request:**
```javascript
// POST /api/questions
// Content-Type: application/json

{
  "defaultTime": 300,
  "questionType": "essay",
  "content": "<p>Phân tích vai trò của công nghệ thông tin trong giáo dục hiện đại.</p>",
  "correctAnswer": "Công nghệ thông tin có vai trò quan trọng: 1) Cá nhân hóa học tập, 2) Mở rộng khả năng tiếp cận, 3) Phương pháp giảng dạy tương tác, 4) Đánh giá tự động và theo dõi tiến bộ.",
  "score": 25,
  "difficulty": "Beta",
  "explanation": "Câu hỏi này đánh giá hiểu biết về ứng dụng công nghệ và khả năng phân tích tổng hợp.",
  "questionTopicId": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tạo câu hỏi thành công", 
  "data": {
    "id": 46,
    "intro": null,
    "defaultTime": 300,
    "questionType": "essay",
    "content": "<p>Phân tích vai trò của công nghệ thông tin trong giáo dục hiện đại.</p>",
    "questionMedia": null,
    "options": null,
    "correctAnswer": "Công nghệ thông tin có vai trò quan trọng: 1) Cá nhân hóa học tập, 2) Mở rộng khả năng tiếp cận, 3) Phương pháp giảng dạy tương tác, 4) Đánh giá tự động và theo dõi tiến bộ.",
    "mediaAnswer": null,
    "score": 25,
    "difficulty": "Beta",
    "explanation": "Câu hỏi này đánh giá hiểu biết về ứng dụng công nghệ và khả năng phân tích tổng hợp.",
    "questionTopicId": 2,
    "isActive": true,
    "createdAt": "2025-06-14T15:35:12.456Z",
    "updatedAt": "2025-06-14T15:35:12.456Z",
    "questionTopic": {
      "id": 2,
      "name": "Công nghệ thông tin"
    }
  },
  "timestamp": "2025-06-14T15:35:12.456Z"
}
```

### **📎 Create Question with Media (Form-Data)**

**Request Setup (Postman/Frontend):**
```javascript
// POST /api/questions  
// Content-Type: multipart/form-data

const formData = new FormData();
formData.append('defaultTime', '120');
formData.append('questionType', 'multiple_choice');
formData.append('content', '<p>What do you see in this image?</p>');
formData.append('options', JSON.stringify(['Cat', 'Dog', 'Bird', 'Fish']));
formData.append('correctAnswer', 'Cat');
formData.append('score', '15');
formData.append('difficulty', 'Beta');
formData.append('questionTopicId', '1');
formData.append('questionMedia', file1); // File object
formData.append('questionMedia', file2); // File object
formData.append('mediaAnswer', audioFile); // File object
```

**Response:**
```json
{
  "success": true,
  "message": "Tạo câu hỏi thành công",
  "data": {
    "id": 47,
    "defaultTime": 120,
    "questionType": "multiple_choice",
    "content": "<p>What do you see in this image?</p>",
    "questionMedia": [
      {
        "type": "image",
        "url": "/uploads/questions/question-image-1718380245123-825321091.jpg",
        "filename": "question-image-1718380245123-825321091.jpg",
        "size": 245760,
        "mimeType": "image/jpeg"
      },
      {
        "type": "image", 
        "url": "/uploads/questions/question-image-1718380245124-825321092.png",
        "filename": "question-image-1718380245124-825321092.png",
        "size": 156420,
        "mimeType": "image/png"
      }
    ],
    "options": ["Cat", "Dog", "Bird", "Fish"],
    "correctAnswer": "Cat",
    "mediaAnswer": [
      {
        "type": "audio",
        "url": "/uploads/questions/question-audio-1718380245125-825321093.mp3",
        "filename": "question-audio-1718380245125-825321093.mp3",
        "size": 512768,
        "mimeType": "audio/mpeg"
      }
    ],
    "score": 15,
    "difficulty": "Beta",
    "questionTopicId": 1,
    "isActive": true,
    "createdAt": "2025-06-14T15:40:45.123Z",
    "updatedAt": "2025-06-14T15:40:45.123Z"
  },
  "timestamp": "2025-06-14T15:40:45.123Z"
}
```

### **📊 Get Questions with Pagination**

**Request:**
```javascript
// GET /api/questions?page=1&limit=5&search=toán&difficulty=Alpha&sortBy=score&sortOrder=desc
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách câu hỏi thành công",
  "data": {
    "questions": [
      {
        "id": 45,
        "intro": "Câu hỏi Toán học cơ bản",
        "defaultTime": 90,
        "questionType": "multiple_choice",
        "content": "<p><strong>Tính: 5 + 7 = ?</strong></p>",
        "questionMedia": null,
        "options": ["10", "11", "12", "13"],
        "correctAnswer": "12",
        "mediaAnswer": null,
        "score": 10,
        "difficulty": "Alpha",
        "explanation": "5 + 7 = 12 là phép cộng cơ bản",
        "questionTopicId": 1,
        "isActive": true,
        "createdAt": "2025-06-14T15:30:45.123Z",
        "updatedAt": "2025-06-14T15:30:45.123Z",
        "questionTopic": {
          "id": 1,
          "name": "Toán học"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 15,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "2025-06-14T15:45:12.789Z"
}
```

### **✏️ Update Question (Partial)**

**Request:**
```javascript
// PATCH /api/questions/45
// Content-Type: application/json

{
  "content": "<p><strong>UPDATED: Tính: 8 + 9 = ?</strong></p>",
  "options": ["15", "16", "17", "18"],
  "correctAnswer": "17",
  "score": 12,
  "explanation": "8 + 9 = 17 (đã cập nhật)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cập nhật câu hỏi thành công",
  "data": {
    "id": 45,
    "intro": "Câu hỏi Toán học cơ bản",
    "defaultTime": 90,
    "questionType": "multiple_choice", 
    "content": "<p><strong>UPDATED: Tính: 8 + 9 = ?</strong></p>",
    "questionMedia": null,
    "options": ["15", "16", "17", "18"],
    "correctAnswer": "17",
    "mediaAnswer": null,
    "score": 12,
    "difficulty": "Alpha",
    "explanation": "8 + 9 = 17 (đã cập nhật)",
    "questionTopicId": 1,
    "isActive": true,
    "createdAt": "2025-06-14T15:30:45.123Z",
    "updatedAt": "2025-06-14T15:50:30.456Z"
  },
  "timestamp": "2025-06-14T15:50:30.456Z"
}
```

### **📎 Upload Media to Existing Question**

**Request:**
```javascript
// POST /api/questions/45/media
// Content-Type: multipart/form-data

const formData = new FormData();
formData.append('media', imageFile1);
formData.append('media', imageFile2); 
formData.append('media', videoFile1);
```

**Response:**
```json
{
  "success": true,
  "message": "Upload media thành công",
  "data": {
    "success": true,
    "uploadedFiles": [
      {
        "type": "image",
        "url": "/uploads/questions/question-image-1718380845123-825321094.jpg",
        "filename": "question-image-1718380845123-825321094.jpg",
        "size": 342156,
        "mimeType": "image/jpeg"
      },
      {
        "type": "image",
        "url": "/uploads/questions/question-image-1718380845124-825321095.png", 
        "filename": "question-image-1718380845124-825321095.png",
        "size": 198432,
        "mimeType": "image/png"
      },
      {
        "type": "video",
        "url": "/uploads/questions/question-video-1718380845125-825321096.mp4",
        "filename": "question-video-1718380845125-825321096.mp4",
        "size": 5242880,
        "mimeType": "video/mp4"
      }
    ],
    "errors": []
  },
  "timestamp": "2025-06-14T15:55:45.789Z"
}
```

### **🗑️ Batch Delete Questions**

**Request:**
```javascript
// DELETE /api/questions/batch
// Content-Type: application/json

{
  "ids": [10, 11, 12, 13, 14],
  "hardDelete": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch delete hoàn thành: 4/5 thành công, 1 thất bại",
  "data": {
    "successIds": [10, 11, 12, 14],
    "failedIds": [13],
    "errors": [
      {
        "id": 13,
        "error": "Question not found"
      }
    ],
    "summary": {
      "total": 5,
      "success": 4,
      "failed": 1
    }
  },
  "timestamp": "2025-06-14T16:00:15.123Z"
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
    "code": "ERROR_CODE",
    "details": [
      {
        "field": "fieldName",
        "message": "Field specific error"
      }
    ]
  },
  "timestamp": "2025-06-14T16:05:30.789Z"
}
```

### **Common Error Codes:**

#### **🔍 Validation Errors (400)**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "defaultTime",
        "message": "Thời gian tối thiểu là 10 giây"
      },
      {
        "field": "options",
        "message": "Phải có ít nhất 2 lựa chọn"
      }
    ]
  },
  "timestamp": "2025-06-14T16:05:30.789Z"
}
```

#### **🚫 Not Found (404)**
```json
{
  "success": false,
  "message": "Question not found",
  "error": {
    "code": "QUESTION_NOT_FOUND"
  },
  "timestamp": "2025-06-14T16:05:30.789Z"
}
```

#### **📁 File Upload Errors (400)**
```json
{
  "success": false,
  "message": "File quá lớn. Kích thước tối đa cho image là 5.0MB",
  "error": {
    "code": "FILE_TOO_LARGE"
  },
  "timestamp": "2025-06-14T16:05:30.789Z"
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
  "timestamp": "2025-06-14T16:05:30.789Z"
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
  "timestamp": "2025-06-14T16:05:30.789Z"
}
```

### **Field Validation Rules:**

| Field | Rules | Error Messages |
|-------|-------|----------------|
| `defaultTime` | 10-1800 seconds | "Thời gian tối thiểu là 10 giây", "Thời gian tối đa là 30 phút" |
| `questionType` | enum: multiple_choice, essay | "Question type không hợp lệ" |
| `content` | required, min 1 char | "Nội dung HTML không được để trống" |
| `options` | 2-6 items (for multiple_choice) | "Phải có ít nhất 2 lựa chọn", "Không được quá 6 lựa chọn" |
| `correctAnswer` | required, min 1 char | "Đáp án đúng không được để trống" |
| `score` | 1-100 | "Điểm tối thiểu là 1", "Điểm tối đa là 100" |
| `difficulty` | enum: Alpha, Beta, Rc, Gold | "Difficulty không hợp lệ" |
| `questionTopicId` | positive integer, exists | "Question Topic ID phải là số dương", "Question Topic không tồn tại" |

---

## 📁 **File Upload Guide**

### **Supported File Types:**

| Media Type | Extensions | Max Size | MIME Types |
|------------|------------|----------|------------|
| **Images** | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg` | 5MB | `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml` |
| **Videos** | `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm`, `.mkv` | 100MB | `video/mp4`, `video/avi`, `video/quicktime`, `video/x-ms-wmv`, `video/x-flv`, `video/webm`, `video/x-matroska` |
| **Audio** | `.mp3`, `.wav`, `.ogg`, `.aac`, `.flac`, `.m4a` | 20MB | `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/aac`, `audio/flac`, `audio/mp4` |

### **Upload Limits:**
- **Max files per request**: 10 files
- **Max total size**: 500MB per request
- **Concurrent uploads**: Up to 5 simultaneous requests

### **File Naming Convention:**
```
question-{type}-{timestamp}-{random}.{extension}
Examples:
- question-image-1718380245123-825321091.jpg
- question-video-1718380245124-825321092.mp4
- question-audio-1718380245125-825321093.mp3
```

### **File URL Format:**
```
Backend stores: /uploads/questions/filename.ext
Full URL: http://localhost:3000/uploads/questions/filename.ext
Frontend usage: `${baseURL}${mediaFile.url}`
```

---

## 💻 **Frontend Implementation**

### **🔧 React Hooks Example:**

```jsx
import React, { useState, useEffect } from 'react';

const QuestionManager = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  
  const baseURL = 'http://localhost:3000';
  const apiURL = `${baseURL}/api/questions`;

  // Fetch questions with filters
  const fetchQuestions = async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${apiURL}?${queryString}`);
      const result = await response.json();
      
      if (result.success) {
        setQuestions(result.data.questions);
        setPagination(result.data.pagination);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  // Create question with media
  const createQuestion = async (questionData, files = []) => {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(questionData).forEach(key => {
      if (key === 'options' && questionData[key]) {
        formData.append(key, JSON.stringify(questionData[key]));
      } else if (questionData[key] !== undefined) {
        formData.append(key, questionData[key]);
      }
    });
    
    // Add files
    files.forEach(file => {
      formData.append('questionMedia', file);
    });

    try {
      const response = await fetch(apiURL, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh questions list
        fetchQuestions();
        return result.data;
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Update question
  const updateQuestion = async (id, updateData) => {
    try {
      const response = await fetch(`${apiURL}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update local state
        setQuestions(prev => 
          prev.map(q => q.id === id ? result.data : q)
        );
        return result.data;
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Delete question
  const deleteQuestion = async (id, hardDelete = false) => {
    const url = hardDelete ? `${apiURL}/${id}/hard` : `${apiURL}/${id}`;
    const method = hardDelete ? 'DELETE' : 'PUT';
    
    try {
      const response = await fetch(url, { method });
      const result = await response.json();
      
      if (result.success) {
        if (hardDelete) {
          // Remove from local state
          setQuestions(prev => prev.filter(q => q.id !== id));
        } else {
          // Update active status
          setQuestions(prev => 
            prev.map(q => q.id === id ? { ...q, isActive: false } : q)
          );
        }
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  return {
    questions,
    loading,
    error,
    pagination,
    fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion
  };
};

// Question display component
const QuestionDisplay = ({ question }) => {
  const baseURL = 'http://localhost:3000';
  
  return (
    <div className="question-card">
      <div className="question-header">
        <h3>Question #{question.id}</h3>
        <span className={`difficulty ${question.difficulty.toLowerCase()}`}>
          {question.difficulty}
        </span>
        <span className="score">{question.score} points</span>
      </div>
      
      <div className="question-content">
        {question.intro && (
          <p className="intro">{question.intro}</p>
        )}
        
        <div 
          className="content"
          dangerouslySetInnerHTML={{ __html: question.content }}
        />
        
        {/* Display media files */}
        {question.questionMedia && question.questionMedia.length > 0 && (
          <div className="media-gallery">
            <h4>Media Files:</h4>
            <div className="media-grid">
              {question.questionMedia.map((media, index) => (
                <div key={index} className="media-item">
                  {media.type === 'image' && (
                    <img 
                      src={`${baseURL}${media.url}`}
                      alt={media.filename}
                      className="media-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        console.error('Image failed to load:', media.url);
                      }}
                    />
                  )}
                  {media.type === 'video' && (
                    <video 
                      src={`${baseURL}${media.url}`}
                      controls
                      className="media-video"
                    />
                  )}
                  {media.type === 'audio' && (
                    <audio 
                      src={`${baseURL}${media.url}`}
                      controls
                      className="media-audio"
                    />
                  )}
                  <p className="media-info">
                    {media.filename} ({(media.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Display options for multiple choice */}
        {question.questionType === 'multiple_choice' && question.options && (
          <div className="question-options">
            <h4>Options:</h4>
            <ul>
              {question.options.map((option, index) => (
                <li 
                  key={index}
                  className={option === question.correctAnswer ? 'correct' : ''}
                >
                  {String.fromCharCode(65 + index)}. {option}
                  {option === question.correctAnswer && ' ✓'}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Display answer explanation media */}
        {question.mediaAnswer && question.mediaAnswer.length > 0 && (
          <div className="answer-media">
            <h4>Answer Explanation:</h4>
            {question.mediaAnswer.map((media, index) => (
              <div key={index}>
                {media.type === 'image' && (
                  <img 
                    src={`${baseURL}${media.url}`}
                    alt="Answer explanation"
                    className="answer-image"
                  />
                )}
                {media.type === 'video' && (
                  <video 
                    src={`${baseURL}${media.url}`}
                    controls
                    className="answer-video"
                  />
                )}
                {media.type === 'audio' && (
                  <audio 
                    src={`${baseURL}${media.url}`}
                    controls
                    className="answer-audio"
                  />
                )}
              </div>
            ))}
          </div>
        )}
        
        {question.explanation && (
          <div className="explanation">
            <h4>Explanation:</h4>
            <p>{question.explanation}</p>
          </div>
        )}
      </div>
      
      <div className="question-footer">
        <span className="topic">
          {question.questionTopic?.name}
        </span>
        <span className="time">
          {question.defaultTime} seconds
        </span>
        <span className="status">
          {question.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  );
};

export { QuestionManager, QuestionDisplay };
```

### **🎨 CSS Styles:**

```css
.question-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin: 15px 0;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.difficulty {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.difficulty.alpha { background: #e3f2fd; color: #1976d2; }
.difficulty.beta { background: #f3e5f5; color: #7b1fa2; }
.difficulty.rc { background: #fff3e0; color: #f57c00; }
.difficulty.gold { background: #fff8e1; color: #f9a825; }

.score {
  background: #4caf50;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.media-gallery {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 6px;
  background: #f9f9f9;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 10px;
}

.media-item {
  text-align: center;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.media-image, .media-video {
  max-width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 4px;
}

.media-audio, .answer-audio {
  width: 100%;
}

.media-info {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.question-options ul {
  list-style: none;
  padding: 0;
}

.question-options li {
  padding: 8px 12px;
  margin: 5px 0;
  border-left: 3px solid #ddd;
  background: #f5f5f5;
}

.question-options li.correct {
  border-left-color: #4caf50;
  background: #e8f5e8;
  color: #2e7d32;
  font-weight: bold;
}

.question-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #eee;
  font-size: 14px;
  color: #666;
}

.status {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: bold;
}

.status:contains('Active') {
  background: #e8f5e8;
  color: #2e7d32;
}

.status:contains('Inactive') {
  background: #ffebee;
  color: #c62828;
}
```

---

## 🧪 **Testing Examples**

### **📋 Postman Collection Structure:**

```
📁 Question API Testing
├── 🔧 Setup & Health Check
│   ├── GET Health Check
│   └── GET List Topics (for IDs)
├── 📋 Basic CRUD Operations
│   ├── GET List Questions
│   ├── POST Create Multiple Choice
│   ├── POST Create Essay
│   ├── GET Question Details
│   ├── PATCH Update Question
│   └── PUT Soft Delete
├── 📎 Media Upload Tests
│   ├── POST Create with Media
│   └── POST Upload to Existing
├── 🔍 Search & Filter Tests
│   ├── GET Search by Text
│   ├── GET Filter by Type
│   ├── GET Filter by Difficulty
│   └── GET Complex Filters
├── 🗂️ Batch Operations
│   ├── DELETE Batch Soft Delete
│   └── DELETE Batch Hard Delete
└── ❌ Error & Validation Tests
    ├── POST Invalid Data
    ├── POST Missing Fields
    └── POST Invalid File Types
```

### **🔧 Environment Variables:**
```json
{
  "baseUrl": "http://localhost:3000/api",
  "questionId": "",
  "lastCreatedId": "",
  "essayQuestionId": "",
  "mediaQuestionId": ""
}
```

### **📊 Test Scripts (Postman):**

**Auto-save Question ID:**
```javascript
// Add to Tests tab of POST create question
if (pm.response.code === 201) {
    const response = pm.response.json();
    if (response.success && response.data.id) {
        pm.environment.set('questionId', response.data.id);
        pm.environment.set('lastCreatedId', response.data.id);
        
        if (response.data.questionType === 'essay') {
            pm.environment.set('essayQuestionId', response.data.id);
        }
        
        if (response.data.questionMedia && response.data.questionMedia.length > 0) {
            pm.environment.set('mediaQuestionId', response.data.id);
        }
    }
}

// Validate response structure
pm.test("Response has success true", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
});

pm.test("Response has question data", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property('id');
    pm.expect(jsonData.data).to.have.property('content');
    pm.expect(jsonData.data).to.have.property('questionType');
});
```

**Validate Media URLs:**
```javascript
// Add to Tests tab of media upload requests
pm.test("Media files uploaded successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    
    if (jsonData.data.questionMedia) {
        jsonData.data.questionMedia.forEach(media => {
            pm.expect(media).to.have.property('type');
            pm.expect(media).to.have.property('url');
            pm.expect(media).to.have.property('filename');
            pm.expect(media).to.have.property('size');
            pm.expect(media).to.have.property('mimeType');
            
            // Validate URL format
            pm.expect(media.url).to.match(/^\/uploads\/questions\/.+/);
        });
    }
});
```

### **🎯 Test Data Examples:**

**Valid Test Data:**
```javascript
// Multiple Choice Question
const validMultipleChoice = {
    "intro": "Test multiple choice question",
    "defaultTime": 60,
    "questionType": "multiple_choice",
    "content": "<p>What is 2 + 2?</p>",
    "options": ["3", "4", "5", "6"],
    "correctAnswer": "4",
    "score": 10,
    "difficulty": "Alpha",
    "explanation": "Basic addition: 2 + 2 = 4",
    "questionTopicId": 1
};

// Essay Question
const validEssay = {
    "defaultTime": 300,
    "questionType": "essay",
    "content": "<p>Explain the importance of education.</p>",
    "correctAnswer": "Education is fundamental for personal development and societal progress.",
    "score": 25,
    "difficulty": "Beta",
    "explanation": "This question tests analytical thinking.",
    "questionTopicId": 2
};
```

**Invalid Test Data:**
```javascript
// Missing required fields
const missingFields = {
    "questionType": "multiple_choice"
    // Missing content, correctAnswer, etc.
};

// Invalid values
const invalidValues = {
    "defaultTime": 5,  // Too small (min 10)
    "questionType": "invalid_type",
    "content": "<p>Test</p>",
    "score": 150,  // Too large (max 100)
    "difficulty": "Invalid",
    "questionTopicId": -1
};

// Invalid options
const invalidOptions = {
    "defaultTime": 60,
    "questionType": "multiple_choice",
    "content": "<p>Test</p>",
    "options": ["Only one option"],  // Need at least 2
    "correctAnswer": "Test",
    "score": 10,
    "difficulty": "Alpha",
    "questionTopicId": 1
};
```

---

## ✅ **Best Practices**

### **🔧 Frontend Development:**

1. **Error Handling:**
```javascript
// Always handle both network and API errors
try {
  const response = await fetch(url);
  const result = await response.json();
  
  if (!result.success) {
    // Handle API errors
    if (result.error?.details) {
      // Show field-specific validation errors
      result.error.details.forEach(detail => {
        showFieldError(detail.field, detail.message);
      });
    } else {
      // Show general error
      showError(result.message);
    }
    return;
  }
  
  // Handle success
  handleSuccess(result.data);
} catch (error) {
  // Handle network errors
  showError('Lỗi kết nối server');
}
```

2. **File Upload Validation:**
```javascript
const validateFiles = (files) => {
  const maxSizes = {
    image: 5 * 1024 * 1024,    // 5MB
    video: 100 * 1024 * 1024,  // 100MB
    audio: 20 * 1024 * 1024    // 20MB
  };
  
  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/avi', 'video/quicktime', 'video/webm'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac']
  };
  
  for (const file of files) {
    const mediaType = file.type.startsWith('image/') ? 'image' :
                     file.type.startsWith('video/') ? 'video' :
                     file.type.startsWith('audio/') ? 'audio' : null;
    
    if (!mediaType) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }
    
    if (file.size > maxSizes[mediaType]) {
      const maxSizeMB = (maxSizes[mediaType] / 1024 / 1024).toFixed(1);
      throw new Error(`File "${file.name}" is too large. Max size for ${mediaType} is ${maxSizeMB}MB`);
    }
    
    if (!allowedTypes[mediaType].includes(file.type)) {
      throw new Error(`File type ${file.type} is not supported for ${mediaType}`);
    }
  }
};
```

3. **Pagination Component:**
```jsx
const Pagination = ({ pagination, onPageChange }) => {
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

4. **Search & Filter Hook:**
```javascript
const useQuestionFilters = () => {
  const [filters, setFilters] = useState({
    search: '',
    questionType: '',
    difficulty: '',
    questionTopicId: '',
    hasMedia: '',
    isActive: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10
  });
  
  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };
  
  const resetFilters = () => {
    setFilters({
      search: '',
      questionType: '',
      difficulty: '',
      questionTopicId: '',
      hasMedia: '',
      isActive: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 10
    });
  };
  
  return { filters, updateFilter, resetFilters };
};
```

### **🔒 Security Considerations:**

1. **Input Sanitization:**
   - Always validate and sanitize HTML content
   - Use DOMPurify for HTML sanitization
   - Validate file types on both frontend and backend

2. **File Upload Security:**
   - Validate file extensions and MIME types
   - Check file sizes before upload
   - Display loading states during upload
   - Handle upload progress for large files

3. **API Security:**
   - Always validate responses
   - Handle authentication tokens securely
   - Use HTTPS in production
   - Implement proper CORS policies

### **🚀 Performance Optimization:**

1. **Lazy Loading:**
```javascript
// Lazy load media files
const LazyMedia = ({ media, baseURL }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  return (
    <div className="lazy-media">
      {!loaded && !error && <div className="media-loading">Loading...</div>}
      {error && <div className="media-error">Failed to load</div>}
      
      {media.type === 'image' && (
        <img
          src={`${baseURL}${media.url}`}
          alt={media.filename}
          style={{ display: loaded ? 'block' : 'none' }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
};
```

2. **Debounced Search:**
```javascript
import { useMemo } from 'react';
import { debounce } from 'lodash';

const useSearch = (onSearch, delay = 300) => {
  const debouncedSearch = useMemo(
    () => debounce(onSearch, delay),
    [onSearch, delay]
  );
  
  return debouncedSearch;
};
```

3. **Caching Strategy:**
```javascript
// Simple cache implementation
const cache = new Map();

const fetchWithCache = async (url, ttl = 5 * 60 * 1000) => { // 5 minutes TTL
  const cached = cache.get(url);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const response = await fetch(url);
  const data = await response.json();
  
  cache.set(url, {
    data,
    timestamp: Date.now()
  });
  
  return data;
};
```

---

## 🎉 **Summary**

Để sử dụng Question module thành công, frontend cần:

### **✅ Must Do:**
1. **Handle multipart/form-data** cho file uploads
2. **Validate files** trước khi upload (type, size, count)
3. **Parse options correctly** (array of strings)
4. **Display media files** từ backend URLs
5. **Handle pagination** và search filters
6. **Implement proper error handling** cho tất cả scenarios
7. **Use FormData** cho requests có files

### **✅ Best Practices:**
1. **Debounce search inputs** để tránh spam requests
2. **Cache responses** khi có thể
3. **Lazy load media files** để tối ưu performance
4. **Validate input client-side** trước khi gửi server
5. **Show loading states** cho UX tốt hơn
6. **Handle offline scenarios** gracefully

### **📋 Key URLs:**
```
Base API: http://localhost:3000/api/questions
Media Files: http://localhost:3000/uploads/questions/filename.ext
Health Check: http://localhost:3000/health
```

**🎊 Module Question đã ready cho frontend integration với documentation đầy đủ này!**

# 🏢 Sponsor Module - Complete API Documentation

## 📋 **Table of Contents**
1. [Overview](#overview)
2. [Data Structure](#data-structure)
3. [API Endpoints](#api-endpoints)
4. [File Upload](#file-upload)
5. [Request/Response Examples](#request-response-examples)
6. [Error Handling](#error-handling)
7. [Testing Examples](#testing-examples)
8. [Best Practices](#best-practices)

---

## 🎯 **Overview**

Sponsor module quản lý nhà tài trợ cho các cuộc thi với các tính năng:

### **Core Features:**
- ✅ **CRUD Operations**: Create, Read, Update (PATCH), Hard Delete
- ✅ **Contest Integration**: Get/Create sponsors by contest slug
- ✅ **Batch Delete**: Xóa nhiều nhà tài trợ cùng lúc
- ✅ **Media Upload**: Logo, images, videos với multer
- ✅ **Search & Filter**: Tìm kiếm và lọc theo contest
- ✅ **Statistics**: Thống kê nhà tài trợ

### **Base URL:**
```
http://localhost:3000/api/sponsors
```

### **Authentication:**
- **Public**: GET endpoints (read operations)
- **Admin only**: POST, PATCH, DELETE operations
- **File uploads**: Admin only với media validation

---

## 📊 **Data Structure**

### **Sponsor Object:**
```typescript
{
  id: number;                    // Primary key
  name: string;                  // Tên nhà tài trợ (required, max 255 chars)
  logo: string | null;           // URL logo (optional)
  images: string | null;         // URL hình ảnh (optional)
  videos: string;                // URL video (required, max 255 chars)
  contestId: number | null;      // ID cuộc thi (optional)
  createdAt: string;             // Thời gian tạo
  updatedAt: string;             // Thời gian cập nhật
  
  // Related data
  contest?: {
    id: number;
    name: string;
    slug: string;
    status: string;
  };
}
```

### **File Upload Support:**
```typescript
{
  logo: File;      // Single image file (max 5MB)
  images: File;    // Single image file (max 5MB)  
  videos: File;    // Single video file (max 50MB)
}
```

**Supported formats:**
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Videos**: MP4, AVI, MOV, WMV (implementation dependent)

---

## 🚀 **API Endpoints**

### **1. GET /api/sponsors - List Sponsors**
```
GET /api/sponsors?page=1&limit=10&search=nike&contestId=1&sortBy=name&sortOrder=asc
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max 100) |
| `search` | string | - | Search in sponsor name |
| `contestId` | number | - | Filter by contest |
| `sortBy` | enum | createdAt | `createdAt` \| `updatedAt` \| `name` |
| `sortOrder` | enum | desc | `asc` \| `desc` |

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách nhà tài trợ thành công",
  "data": {
    "sponsors": [
      {
        "id": 1,
        "name": "Nike Vietnam",
        "logo": "/uploads/sponsors/sponsor-logo-123456789.jpg",
        "images": "/uploads/sponsors/sponsor-images-123456789.jpg",
        "videos": "/uploads/sponsors/sponsor-video-123456789.mp4",
        "contestId": 1,
        "createdAt": "2025-06-15T10:00:00.000Z",
        "updatedAt": "2025-06-15T10:00:00.000Z",
        "contest": {
          "id": 1,
          "name": "Cuộc thi Toán học",
          "slug": "toan-hoc-2025",
          "status": "active"
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
  },
  "timestamp": "2025-06-15T10:00:00.000Z"
}
```

### **2. GET /api/sponsors/:id - Get Sponsor by ID**
```
GET /api/sponsors/1
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy thông tin nhà tài trợ thành công",
  "data": {
    "id": 1,
    "name": "Nike Vietnam",
    "logo": "/uploads/sponsors/sponsor-logo-123456789.jpg",
    "images": "/uploads/sponsors/sponsor-images-123456789.jpg", 
    "videos": "/uploads/sponsors/sponsor-video-123456789.mp4",
    "contestId": 1,
    "createdAt": "2025-06-15T10:00:00.000Z",
    "updatedAt": "2025-06-15T10:00:00.000Z",
    "contest": {
      "id": 1,
      "name": "Cuộc thi Toán học",
      "slug": "toan-hoc-2025",
      "status": "active"
    }
  },
  "timestamp": "2025-06-15T10:00:00.000Z"
}
```

### **3. GET /api/sponsors/contest/:slug - Get Sponsors by Contest**
```
GET /api/sponsors/contest/toan-hoc-2025
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy nhà tài trợ theo contest thành công",
  "data": [
    {
      "id": 1,
      "name": "Nike Vietnam",
      "logo": "/uploads/sponsors/sponsor-logo-123456789.jpg",
      "images": "/uploads/sponsors/sponsor-images-123456789.jpg",
      "videos": "/uploads/sponsors/sponsor-video-123456789.mp4",
      "contestId": 1,
      "createdAt": "2025-06-15T10:00:00.000Z",
      "updatedAt": "2025-06-15T10:00:00.000Z",
      "contest": {
        "id": 1,
        "name": "Cuộc thi Toán học",
        "slug": "toan-hoc-2025",
        "status": "active"
      }
    },
    {
      "id": 2,
      "name": "Adidas Vietnam",
      "logo": "/uploads/sponsors/sponsor-logo-987654321.jpg",
      "images": null,
      "videos": "/uploads/sponsors/sponsor-video-987654321.mp4",
      "contestId": 1,
      "createdAt": "2025-06-15T10:05:00.000Z",
      "updatedAt": "2025-06-15T10:05:00.000Z",
      "contest": {
        "id": 1,
        "name": "Cuộc thi Toán học",
        "slug": "toan-hoc-2025",
        "status": "active"
      }
    }
  ],
  "timestamp": "2025-06-15T10:10:00.000Z"
}
```

### **4. POST /api/sponsors - Create Sponsor**
```
POST /api/sponsors
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Form Data:**
```javascript
const formData = new FormData();
formData.append("name", "Samsung Electronics");
formData.append("videos", videoFile);  // 1 file
formData.append("contestId", "1");
formData.append("logo", logoFile);     // 1 file
formData.append("images", imageFile);  // 1 file
```

**JSON Body (alternative without files):**
```json
{
  "name": "Samsung Electronics",
  "logo": "https://example.com/samsung-logo.jpg",
  "images": "https://example.com/samsung-banner.jpg",
  "videos": "https://youtube.com/watch?v=abc123",
  "contestId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tạo nhà tài trợ thành công",
  "data": {
    "id": 3,
    "name": "Samsung Electronics",
    "logo": "/uploads/sponsors/sponsor-logo-555666777.jpg",
    "images": "/uploads/sponsors/sponsor-images-555666777.jpg",
    "videos": "https://youtube.com/watch?v=abc123",
    "contestId": 1,
    "createdAt": "2025-06-15T10:15:00.000Z",
    "updatedAt": "2025-06-15T10:15:00.000Z",
    "contest": {
      "id": 1,
      "name": "Cuộc thi Toán học",
      "slug": "toan-hoc-2025",
      "status": "active"
    }
  },
  "timestamp": "2025-06-15T10:15:00.000Z"
}
```

### **5. POST /api/sponsors/contest/:slug - Create Sponsor for Contest**
```
POST /api/sponsors/contest/toan-hoc-2025
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Form Data:**
```javascript
const formData = new FormData();
formData.append("name", "Intel Corporation");
formData.append("videos", "https://youtube.com/watch?v=intel123");
formData.append("logo", logoFile);
```

**Response:**
```json
{
  "success": true,
  "message": "Tạo nhà tài trợ cho contest thành công",
  "data": {
    "id": 4,
    "name": "Intel Corporation", 
    "logo": "/uploads/sponsors/sponsor-logo-888999000.jpg",
    "images": null,
    "videos": "https://youtube.com/watch?v=intel123",
    "contestId": 1,
    "createdAt": "2025-06-15T10:20:00.000Z",
    "updatedAt": "2025-06-15T10:20:00.000Z",
    "contest": {
      "id": 1,
      "name": "Cuộc thi Toán học",
      "slug": "toan-hoc-2025",
      "status": "active"
    }
  },
  "timestamp": "2025-06-15T10:20:00.000Z"
}
```

### **6. PATCH /api/sponsors/:id - Update Sponsor**
```
PATCH /api/sponsors/3
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Form Data (partial update):**
```javascript
const formData = new FormData();
formData.append("name", "Samsung Electronics Vietnam");
formData.append("logo", newLogoFile);  // Replace logo
// videos and images unchanged
```

**JSON Body (alternative):**
```json
{
  "name": "Samsung Electronics Vietnam",
  "videos": "https://youtube.com/watch?v=samsung-new",
  "contestId": null
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cập nhật nhà tài trợ thành công",
  "data": {
    "id": 3,
    "name": "Samsung Electronics Vietnam",
    "logo": "/uploads/sponsors/sponsor-logo-111222333.jpg",
    "images": "/uploads/sponsors/sponsor-images-555666777.jpg",
    "videos": "https://youtube.com/watch?v=samsung-new",
    "contestId": null,
    "createdAt": "2025-06-15T10:15:00.000Z",
    "updatedAt": "2025-06-15T10:25:00.000Z",
    "contest": null
  },
  "timestamp": "2025-06-15T10:25:00.000Z"
}
```

### **7. DELETE /api/sponsors/:id - Hard Delete Sponsor**
```
DELETE /api/sponsors/3
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Xóa nhà tài trợ thành công",
  "data": null,
  "timestamp": "2025-06-15T10:30:00.000Z"
}
```

### **8. DELETE /api/sponsors/batch - Batch Delete**
```
DELETE /api/sponsors/batch
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "ids": [1, 2, 3, 4, 5]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch delete hoàn thành: 4/5 thành công, 1 thất bại",
  "data": {
    "successIds": [1, 2, 4, 5],
    "failedIds": [3],
    "errors": [
      {
        "id": 3,
        "error": "Sponsor not found"
      }
    ],
    "summary": {
      "total": 5,
      "success": 4,
      "failed": 1
    }
  },
  "timestamp": "2025-06-15T10:35:00.000Z"
}
```

### **9. POST /api/sponsors/:id/upload - Upload Media**
```
POST /api/sponsors/1/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Form Data:**
```javascript
const formData = new FormData();
formData.append("logo", newLogoFile);
formData.append("videos", newVideoFile);
// images unchanged
```

**Response:**
```json
{
  "success": true,
  "message": "Upload media nhà tài trợ thành công",
  "data": {
    "id": 1,
    "name": "Nike Vietnam",
    "logo": "/uploads/sponsors/sponsor-logo-444555666.jpg",
    "images": "/uploads/sponsors/sponsor-images-123456789.jpg",
    "videos": "/uploads/sponsors/sponsor-video-444555666.mp4",
    "contestId": 1,
    "createdAt": "2025-06-15T10:00:00.000Z",
    "updatedAt": "2025-06-15T10:40:00.000Z",
    "contest": {
      "id": 1,
      "name": "Cuộc thi Toán học",
      "slug": "toan-hoc-2025",
      "status": "active"
    }
  },
  "timestamp": "2025-06-15T10:40:00.000Z"
}
```

### **10. GET /api/sponsors/statistics - Statistics**
```
GET /api/sponsors/statistics
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy thống kê nhà tài trợ thành công",
  "data": {
    "totalSponsors": 50,
    "sponsorsWithContest": 35,
    "sponsorsWithoutContest": 15,
    "totalContests": 12
  },
  "timestamp": "2025-06-15T10:45:00.000Z"
}
```

---

## 📁 **File Upload**

### **Upload Configuration:**
```typescript
// From UPLOAD_CONFIGS.SPONSOR
{
  uploadDir: "sponsors",           // Files saved to uploads/sponsors/
  filePrefix: "sponsor",           // Prefix for generated filenames
  maxFileSize: 5 * 1024 * 1024,   // 5MB limit
  allowedTypes: /jpeg|jpg|png|gif|webp|svg/,
  allowedMimeTypes: /^image\/(jpeg|jpg|png|gif|webp|svg\+xml)$/
}
```

### **File Naming Convention:**
```
sponsor-{timestamp}-{random}.{extension}
```

**Examples:**
- `sponsor-1703123456789-123456789.jpg`
- `sponsor-1703123456789-987654321.png`

### **Frontend Upload Example:**
```javascript
// React component for sponsor upload
const SponsorUpload = () => {
  const [formData, setFormData] = useState({
    name: '',
    videos: '',
    contestId: ''
  });
  const [files, setFiles] = useState({
    logo: null,
    images: null
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const submitData = new FormData();
    
    // Add text fields
    Object.keys(formData).forEach(key => {
      if (formData[key]) {
        submitData.append(key, formData[key]);
      }
    });
    
    // Add files
    Object.keys(files).forEach(key => {
      if (files[key]) {
        submitData.append(key, files[key]);
      }
    });

    try {
      const response = await fetch('/api/sponsors', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });
      
      const result = await response.json();
      console.log('Sponsor created:', result);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data">
      <input
        type="text"
        placeholder="Sponsor Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        required
      />
      
      <input
        type="url"
        placeholder="Video URL"
        value={formData.videos}
        onChange={(e) => setFormData({...formData, videos: e.target.value})}
        required
      />
      
      <input
        type="number"
        placeholder="Contest ID"
        value={formData.contestId}
        onChange={(e) => setFormData({...formData, contestId: e.target.value})}
      />
      
      <div>
        <label>Logo:</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFiles({...files, logo: e.target.files[0]})}
        />
      </div>
      
      <div>
        <label>Images:</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFiles({...files, images: e.target.files[0]})}
        />
      </div>
      
      <button type="submit">Create Sponsor</button>
    </form>
  );
};
```

---

## ❌ **Error Handling**

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
        "field": "name",
        "message": "Tên nhà tài trợ không được để trống"
      },
      {
        "field": "videos",
        "message": "Video không được để trống"
      },
      {
        "field": "contestId",
        "message": "Contest ID phải là số dương"
      }
    ]
  },
  "timestamp": "2025-06-15T10:50:00.000Z"
}
```

#### **🚫 Not Found (404)**
```json
{
  "success": false,
  "message": "Nhà tài trợ không tìm thấy",
  "error": {
    "code": "SPONSOR_NOT_FOUND"
  },
  "timestamp": "2025-06-15T10:50:00.000Z"
}
```

#### **📁 File Upload Errors (400)**
```json
{
  "success": false,
  "message": "File quá lớn. Kích thước tối đa cho phép là 5MB",
  "error": "FILE_TOO_LARGE",
  "timestamp": "2025-06-15T10:50:00.000Z"
}
```

### **Field Validation Rules:**

| Field | Rules | Error Messages |
|-------|-------|----------------|
| `name` | required, 1-255 chars | "Tên nhà tài trợ không được để trống", "Tên nhà tài trợ không được quá 255 ký tự" |
| `videos` | required, max 255 chars | "Video không được để trống", "Video URL không được quá 255 ký tự" |
| `logo` | optional, valid URL | "Logo phải là URL hợp lệ" |
| `images` | optional, valid URL | "Images phải là URL hợp lệ" |
| `contestId` | optional, positive integer | "Contest ID phải là số dương", "Contest không tồn tại" |

---

## 🧪 **Testing Examples**

### **📋 Postman Collection:**

```json
{
  "info": {
    "name": "Sponsor API Tests",
    "description": "Complete Sponsor module testing"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api"
    },
    {
      "key": "token",
      "value": "YOUR_JWT_TOKEN"
    },
    {
      "key": "sponsorId",
      "value": ""
    },
    {
      "key": "contestSlug",
      "value": "toan-hoc-2025"
    }
  ],
  "item": [
    {
      "name": "Create Sponsor",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{baseUrl}}/sponsors",
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "name",
              "value": "Nike Test Sponsor",
              "type": "text"
            },
            {
              "key": "videos",
              "value": "https://youtube.com/watch?v=test123",
              "type": "text"
            },
            {
              "key": "contestId",
              "value": "1",
              "type": "text"
            },
            {
              "key": "logo",
              "type": "file",
              "src": []
            }
          ]
        }
      }
    },
    {
      "name": "Get All Sponsors",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/sponsors?page=1&limit=10"
      }
    },
    {
      "name": "Get Sponsors by Contest",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/sponsors/contest/{{contestSlug}}"
      }
    },
    {
      "name": "Create Sponsor for Contest",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{baseUrl}}/sponsors/contest/{{contestSlug}}",
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "name",
              "value": "Adidas Contest Sponsor",
              "type": "text"
            },
            {
              "key": "videos",
              "value": "https://youtube.com/watch?v=adidas123",
              "type": "text"
            }
          ]
        }
      }
    },
    {
      "name": "Update Sponsor",
      "request": {
        "method": "PATCH",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "url": "{{baseUrl}}/sponsors/{{sponsorId}}",
        "body": {
          "raw": "{\n  \"name\": \"Nike Updated Sponsor\",\n  \"videos\": \"https://youtube.com/watch?v=nike-updated\"\n}"
        }
      }
    },
    {
      "name": "Upload Sponsor Media",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{baseUrl}}/sponsors/{{sponsorId}}/upload",
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "logo",
              "type": "file",
              "src": []
            },
            {
              "key": "images",
              "type": "file",
              "src": []
            }
          ]
        }
      }
    },
    {
      "name": "Get Statistics",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{baseUrl}}/sponsors/statistics"
      }
    },
    {
      "name": "Batch Delete",
      "request": {
        "method": "DELETE",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "url": "{{baseUrl}}/sponsors/batch",
        "body": {
          "raw": "{\n  \"ids\": [1, 2, 3]\n}"
        }
      }
    }
  ]
}
```

---

## ✅ **Best Practices**

### **🔧 Business Logic:**

1. **Contest Association**: Sponsors có thể belong to contest hoặc independent
2. **Media Management**: Auto cleanup old files khi update/delete
3. **File Validation**: Strict validation cho file types và sizes
4. **URL Validation**: Validate video URLs và media URLs

### **🛡️ Security:**

1. **Authorization**: Admin only cho CRUD operations
2. **File Upload**: Secure file handling với multer
3. **Input Validation**: Comprehensive validation với Zod
4. **Path Traversal**: Prevent directory traversal attacks

### **📊 Performance:**

1. **File Storage**: Organized trong uploads/sponsors/ directory
2. **Database Queries**: Efficient indexing trên name và contestId
3. **File Cleanup**: Background cleanup for orphaned files
4. **Pagination**: Efficient pagination cho large datasets

### **🎨 Frontend Integration:**

1. **File Preview**: Show file previews before upload
2. **Progress Indicators**: Upload progress for large files
3. **Error Handling**: User-friendly error messages
4. **Responsive Design**: Mobile-friendly upload interface

---

## 🎉 **Summary**

Sponsor module cung cấp:

### **✅ Core Features:**
- ✅ **Full CRUD** với PATCH updates
- ✅ **Contest Integration** với slug-based APIs  
- ✅ **Media Upload** (logo, images, videos)
- ✅ **Batch Operations** với detailed results
- ✅ **Search & Filtering** mạnh mẽ
- ✅ **File Management** với auto cleanup
- ✅ **Statistics** dashboard

### **📋 Key URLs:**
```
Base API: http://localhost:3000/api/sponsors
Contest API: http://localhost:3000/api/sponsors/contest/{slug}
Statistics: http://localhost:3000/api/sponsors/statistics
Health Check: http://localhost:3000/health
```

### **🔑 Important Notes:**
- **Media uploads** require multipart/form-data
- **File cleanup** tự động khi update/delete
- **Contest integration** thông qua slug và ID
- **Admin permissions** required cho modifications

**🎊 Sponsor module đã sẵn sàng cho production với đầy đủ file upload capabilities!**

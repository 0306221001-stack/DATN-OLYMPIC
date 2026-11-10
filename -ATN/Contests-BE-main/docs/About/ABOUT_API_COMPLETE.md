# About API Documentation

## Overview
About API quản lý thông tin giới thiệu về tổ chức/trường học với khả năng upload nhiều media files (logo và banner) được lưu trữ dưới dạng JSON arrays.

## Base URL
```
http://localhost:3000/api/about
```

## Authentication
- **GET endpoints**: Không cần authentication
- **POST, PUT, DELETE endpoints**: Cần authentication với role Admin hoặc Judge

## Media Upload Features
- **Logo**: Hỗ trợ PNG, JPG, GIF, WebP, SVG (tối đa 5MB mỗi file, tối đa 5 files)
- **Banner**: Hỗ trợ images (PNG, JPG, GIF, WebP, SVG - 5MB) và videos (MP4, AVI, MOV, WebM - 100MB), tối đa 5 files
- **Storage**: Files được lưu trong `/uploads/about/logo/` và `/uploads/about/banner/`
- **Format**: Media metadata được lưu dưới dạng JSON arrays

---

## Endpoints

### 1. GET /about
**Lấy danh sách thông tin About với pagination**

#### Request
```http
GET /api/about?page=1&limit=10&search=VTV&isActive=true
```

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Số trang (min: 1) |
| limit | integer | No | 10 | Số records per page (1-100) |
| search | string | No | - | Tìm kiếm theo tên trường, khoa, email |
| isActive | boolean | No | - | Lọc theo trạng thái active |

#### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy danh sách thông tin giới thiệu thành công",
  "data": {
    "aboutList": [
      {
        "id": 1,
        "schoolName": "Đài Truyền hình Việt Nam",
        "website": "https://vtv.vn",
        "departmentName": "Ban Sản xuất các chương trình Giáo dục",
        "email": "olympia@vtv.vn",
        "fanpage": "https://facebook.com/OlympiaOfficial",
        "mapEmbedCode": "<iframe src=\"...\">...</iframe>",
        "logo": [
          {
            "url": "/uploads/about/logo/vtv-logo-main.png",
            "filename": "vtv-logo-main.png",
            "originalName": "VTV Logo Main",
            "size": 124856,
            "mimeType": "image/png",
            "type": "image",
            "description": "Logo chính của VTV"
          },
          {
            "url": "/uploads/about/logo/olympia-logo.png",
            "filename": "olympia-logo.png",
            "originalName": "Olympia Logo",
            "size": 89654,
            "mimeType": "image/png",
            "type": "image",
            "description": "Logo chương trình Olympia"
          }
        ],
        "banner": [
          {
            "url": "/uploads/about/banner/vtv-banner-main.jpg",
            "filename": "vtv-banner-main.jpg",
            "originalName": "VTV Main Banner",
            "size": 456789,
            "mimeType": "image/jpeg",
            "type": "image",
            "description": "Banner chính của VTV"
          },
          {
            "url": "/uploads/about/banner/olympia-intro-video.mp4",
            "filename": "olympia-intro-video.mp4",
            "originalName": "Olympia Intro Video",
            "size": 12456789,
            "mimeType": "video/mp4",
            "type": "video",
            "description": "Video giới thiệu chương trình Olympia"
          }
        ],
        "isActive": true,
        "createdAt": "2025-06-15T10:00:00.000Z",
        "updatedAt": "2025-06-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  },
  "timestamp": "2025-06-15T10:00:00.000Z"
}
```

---

### 2. GET /about/:id
**Lấy thông tin About theo ID**

#### Request
```http
GET /api/about/1
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "Lấy thông tin giới thiệu thành công",
  "data": {
    "id": 1,
    "schoolName": "Đài Truyền hình Việt Nam",
    "website": "https://vtv.vn",
    "departmentName": "Ban Sản xuất các chương trình Giáo dục",
    "email": "olympia@vtv.vn",
    "fanpage": "https://facebook.com/OlympiaOfficial",
    "mapEmbedCode": "<iframe src=\"https://www.google.com/maps/embed?pb=...\">...</iframe>",
    "logo": [
      {
        "url": "/uploads/about/logo/vtv-logo-main.png",
        "filename": "vtv-logo-main.png",
        "originalName": "VTV Logo Main",
        "size": 124856,
        "mimeType": "image/png",
        "type": "image",
        "description": "Logo chính của VTV"
      }
    ],
    "banner": [
      {
        "url": "/uploads/about/banner/vtv-banner-main.jpg",
        "filename": "vtv-banner-main.jpg",
        "originalName": "VTV Main Banner",
        "size": 456789,
        "mimeType": "image/jpeg",
        "type": "image",
        "description": "Banner chính của VTV"
      }
    ],
    "isActive": true,
    "createdAt": "2025-06-15T10:00:00.000Z",
    "updatedAt": "2025-06-15T10:00:00.000Z"
  },
  "timestamp": "2025-06-15T10:00:00.000Z"
}
```

#### Response Error (404)
```json
{
  "success": false,
  "message": "Không tìm thấy thông tin giới thiệu",
  "error": "About not found",
  "timestamp": "2025-06-15T10:00:00.000Z"
}
```

---

### 3. POST /about
**Tạo mới thông tin About**

**Authentication Required**: Admin, Judge

#### Request Headers
```http
Content-Type: multipart/form-data
Authorization: Bearer <your-jwt-token>
```

#### Form Data Fields

##### Text Fields:
| Field | Type | Required | Max Length | Description |
|-------|------|----------|------------|-------------|
| schoolName | string | **Yes** | 255 | Tên trường/tổ chức |
| website | string | No | 255 | URL website (phải là URL hợp lệ) |
| departmentName | string | No | 255 | Tên khoa/phòng ban |
| email | string | No | 255 | Email liên hệ (phải là email hợp lệ) |
| fanpage | string | No | 255 | URL fanpage (phải là URL hợp lệ) |
| mapEmbedCode | string | No | - | Mã embed bản đồ |

##### File Fields:
| Field | Type | Max Files | Max Size | Allowed Types |
|-------|------|-----------|----------|---------------|
| logo | file[] | 5 | 5MB each | PNG, JPG, GIF, WebP, SVG |
| banner | file[] | 5 | 5MB (images), 100MB (videos) | PNG, JPG, GIF, WebP, SVG, MP4, AVI, MOV, WebM |

#### Example Request (cURL)
```bash
curl -X POST "http://localhost:3000/api/about" \
  -H "Authorization: Bearer your-jwt-token" \
  -F "schoolName=Đại học Bách Khoa Hà Nội" \
  -F "website=https://hust.edu.vn" \
  -F "departmentName=Khoa Công nghệ Thông tin" \
  -F "email=info@hust.edu.vn" \
  -F "fanpage=https://facebook.com/hust.edu.vn" \
  -F "mapEmbedCode=<iframe src='https://maps.google.com/...'></iframe>" \
  -F "logo=@./logo1.png" \
  -F "logo=@./logo2.png" \
  -F "banner=@./banner1.jpg" \
  -F "banner=@./intro-video.mp4"
```

#### Example Request (JavaScript/FormData)
```javascript
const formData = new FormData();

// Text fields
formData.append('schoolName', 'Đại học Bách Khoa Hà Nội');
formData.append('website', 'https://hust.edu.vn');
formData.append('departmentName', 'Khoa Công nghệ Thông tin');
formData.append('email', 'info@hust.edu.vn');
formData.append('fanpage', 'https://facebook.com/hust.edu.vn');
formData.append('mapEmbedCode', '<iframe src="..."></iframe>');

// Logo files
formData.append('logo', logoFile1); // File object
formData.append('logo', logoFile2); // Multiple files with same field name

// Banner files
formData.append('banner', bannerImageFile);
formData.append('banner', bannerVideoFile);

const response = await fetch('/api/about', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

#### Response Success (201)
```json
{
  "success": true,
  "message": "Tạo thông tin giới thiệu thành công",
  "data": {
    "id": 2,
    "schoolName": "Đại học Bách Khoa Hà Nội",
    "website": "https://hust.edu.vn",
    "departmentName": "Khoa Công nghệ Thông tin",
    "email": "info@hust.edu.vn",
    "fanpage": "https://facebook.com/hust.edu.vn",
    "mapEmbedCode": "<iframe src='https://maps.google.com/...'></iframe>",
    "logo": [
      {
        "url": "/uploads/about/logo/about-logo-1734567890123-456789123.png",
        "filename": "about-logo-1734567890123-456789123.png",
        "originalName": "logo1.png",
        "size": 245670,
        "mimeType": "image/png",
        "type": "image",
        "description": "Logo file: logo1.png"
      },
      {
        "url": "/uploads/about/logo/about-logo-1734567890124-456789124.png",
        "filename": "about-logo-1734567890124-456789124.png",
        "originalName": "logo2.png",
        "size": 189234,
        "mimeType": "image/png",
        "type": "image",
        "description": "Logo file: logo2.png"
      }
    ],
    "banner": [
      {
        "url": "/uploads/about/banner/about-banner-1734567890125-456789125.jpg",
        "filename": "about-banner-1734567890125-456789125.jpg",
        "originalName": "banner1.jpg",
        "size": 567890,
        "mimeType": "image/jpeg",
        "type": "image",
        "description": "Banner file: banner1.jpg"
      },
      {
        "url": "/uploads/about/banner/about-banner-1734567890126-456789126.mp4",
        "filename": "about-banner-1734567890126-456789126.mp4",
        "originalName": "intro-video.mp4",
        "size": 15678901,
        "mimeType": "video/mp4",
        "type": "video",
        "description": "Banner file: intro-video.mp4"
      }
    ],
    "isActive": true,
    "createdAt": "2025-06-15T10:30:00.000Z",
    "updatedAt": "2025-06-15T10:30:00.000Z"
  },
  "timestamp": "2025-06-15T10:30:00.000Z"
}
```

#### Response Error (400 - Validation)
```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    {
      "field": "schoolName",
      "message": "Vui lòng nhập tên trường"
    },
    {
      "field": "email",
      "message": "Email không hợp lệ"
    },
    {
      "field": "upload",
      "message": "Maximum 5 logo files allowed"
    }
  ],
  "timestamp": "2025-06-15T10:30:00.000Z"
}
```

---

### 4. PUT /about/:id
**Cập nhật thông tin About**

**Authentication Required**: Admin, Judge

#### Request
Tương tự POST nhưng tất cả fields đều optional. Có thể update từng phần:
- Chỉ text fields
- Chỉ logo files
- Chỉ banner files
- Hoặc kết hợp

#### Example: Update chỉ text fields
```bash
curl -X PUT "http://localhost:3000/api/about/2" \
  -H "Authorization: Bearer your-jwt-token" \
  -F "schoolName=Đại học Bách Khoa Hà Nội - Cập nhật" \
  -F "website=https://www.hust.edu.vn"
```

#### Example: Update chỉ logo
```bash
curl -X PUT "http://localhost:3000/api/about/2" \
  -H "Authorization: Bearer your-jwt-token" \
  -F "logo=@./new-logo.png"
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "Cập nhật thông tin giới thiệu thành công",
  "data": {
    "id": 2,
    "schoolName": "Đại học Bách Khoa Hà Nội - Cập nhật",
    "website": "https://www.hust.edu.vn",
    "departmentName": "Khoa Công nghệ Thông tin",
    "email": "info@hust.edu.vn",
    "fanpage": "https://facebook.com/hust.edu.vn",
    "mapEmbedCode": "<iframe src='https://maps.google.com/...'></iframe>",
    "logo": [
      {
        "url": "/uploads/about/logo/about-logo-1734567890200-456789200.png",
        "filename": "about-logo-1734567890200-456789200.png",
        "originalName": "new-logo.png",
        "size": 198765,
        "mimeType": "image/png",
        "type": "image",
        "description": "Logo file: new-logo.png"
      }
    ],
    "banner": [
      // ... existing banners remain unchanged
    ],
    "isActive": true,
    "createdAt": "2025-06-15T10:30:00.000Z",
    "updatedAt": "2025-06-15T11:00:00.000Z"
  },
  "timestamp": "2025-06-15T11:00:00.000Z"
}
```

---

### 5. DELETE /about/:id
**Xóa About (soft delete)**

**Authentication Required**: Admin, Judge

#### Request
```http
DELETE /api/about/2
Authorization: Bearer <your-jwt-token>
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "Xóa thông tin giới thiệu thành công",
  "data": {
    "id": 2,
    "schoolName": "Đại học Bách Khoa Hà Nội",
    "isActive": false,
    "updatedAt": "2025-06-15T11:15:00.000Z"
  },
  "timestamp": "2025-06-15T11:15:00.000Z"
}
```

---

### 6. PATCH /about/:id/restore
**Khôi phục About đã xóa**

**Authentication Required**: Admin, Judge

#### Request
```http
PATCH /api/about/2/restore
Authorization: Bearer <your-jwt-token>
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "Khôi phục thông tin giới thiệu thành công",
  "data": {
    "id": 2,
    "schoolName": "Đại học Bách Khoa Hà Nội",
    "isActive": true,
    "updatedAt": "2025-06-15T11:20:00.000Z"
  },
  "timestamp": "2025-06-15T11:20:00.000Z"
}
```

---

### 7. DELETE /about/:id/permanent
**Xóa vĩnh viễn About**

**Authentication Required**: Admin, Judge

#### Request
```http
DELETE /api/about/2/permanent
Authorization: Bearer <your-jwt-token>
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "Xóa vĩnh viễn thông tin giới thiệu thành công",
  "data": {
    "id": 2,
    "schoolName": "Đại học Bách Khoa Hà Nội"
  },
  "timestamp": "2025-06-15T11:25:00.000Z"
}
```

---

## Error Responses

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Access token is required",
  "timestamp": "2025-06-15T10:00:00.000Z"
}
```

### 403 - Forbidden
```json
{
  "success": false,
  "message": "Không có quyền truy cập",
  "timestamp": "2025-06-15T10:00:00.000Z"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "Không tìm thấy thông tin giới thiệu",
  "error": "About not found",
  "timestamp": "2025-06-15T10:00:00.000Z"
}
```

### 413 - File Too Large
```json
{
  "success": false,
  "message": "Upload error: File too large",
  "timestamp": "2025-06-15T10:00:00.000Z"
}
```

### 415 - Unsupported Media Type
```json
{
  "success": false,
  "message": "Upload error: Unsupported file type",
  "timestamp": "2025-06-15T10:00:00.000Z"
}
```

---

## Frontend Implementation Guide

### React/TypeScript Example

#### Types Definition
```typescript
interface MediaObject {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  type: 'image' | 'video';
  description?: string;
}

interface About {
  id: number;
  schoolName: string;
  website?: string;
  departmentName?: string;
  email?: string;
  fanpage?: string;
  mapEmbedCode?: string;
  logo?: MediaObject[];
  banner?: MediaObject[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AboutFormData {
  schoolName: string;
  website?: string;
  departmentName?: string;
  email?: string;
  fanpage?: string;
  mapEmbedCode?: string;
  logoFiles?: File[];
  bannerFiles?: File[];
}
```

#### Create/Update Component
```tsx
import React, { useState } from 'react';

const AboutForm: React.FC = () => {
  const [formData, setFormData] = useState<AboutFormData>({
    schoolName: '',
    website: '',
    departmentName: '',
    email: '',
    fanpage: '',
    mapEmbedCode: '',
    logoFiles: [],
    bannerFiles: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    
    // Add text fields
    formDataToSend.append('schoolName', formData.schoolName);
    if (formData.website) formDataToSend.append('website', formData.website);
    if (formData.departmentName) formDataToSend.append('departmentName', formData.departmentName);
    if (formData.email) formDataToSend.append('email', formData.email);
    if (formData.fanpage) formDataToSend.append('fanpage', formData.fanpage);
    if (formData.mapEmbedCode) formDataToSend.append('mapEmbedCode', formData.mapEmbedCode);
    
    // Add logo files
    formData.logoFiles?.forEach(file => {
      formDataToSend.append('logo', file);
    });
    
    // Add banner files
    formData.bannerFiles?.forEach(file => {
      formDataToSend.append('banner', file);
    });
    
    try {
      const response = await fetch('/api/about', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('About created successfully:', result.data);
      } else {
        console.error('Error:', result.message);
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        logoFiles: Array.from(e.target.files!)
      }));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        bannerFiles: Array.from(e.target.files!)
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Tên trường *</label>
        <input
          type="text"
          value={formData.schoolName}
          onChange={(e) => setFormData(prev => ({ ...prev, schoolName: e.target.value }))}
          required
          maxLength={255}
        />
      </div>
      
      <div>
        <label>Website</label>
        <input
          type="url"
          value={formData.website}
          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
          maxLength={255}
        />
      </div>
      
      <div>
        <label>Tên khoa/phòng ban</label>
        <input
          type="text"
          value={formData.departmentName}
          onChange={(e) => setFormData(prev => ({ ...prev, departmentName: e.target.value }))}
          maxLength={255}
        />
      </div>
      
      <div>
        <label>Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          maxLength={255}
        />
      </div>
      
      <div>
        <label>Fanpage</label>
        <input
          type="url"
          value={formData.fanpage}
          onChange={(e) => setFormData(prev => ({ ...prev, fanpage: e.target.value }))}
          maxLength={255}
        />
      </div>
      
      <div>
        <label>Mã embed bản đồ</label>
        <textarea
          value={formData.mapEmbedCode}
          onChange={(e) => setFormData(prev => ({ ...prev, mapEmbedCode: e.target.value }))}
        />
      </div>
      
      <div>
        <label>Logo (PNG, JPG, GIF, WebP, SVG - max 5MB each, max 5 files)</label>
        <input
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
          onChange={handleLogoChange}
        />
        {formData.logoFiles && formData.logoFiles.length > 0 && (
          <div>
            Selected: {formData.logoFiles.map(f => f.name).join(', ')}
          </div>
        )}
      </div>
      
      <div>
        <label>Banner (Images: PNG,JPG,GIF,WebP,SVG-5MB | Videos: MP4,AVI,MOV,WebM-100MB, max 5 files)</label>
        <input
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.avi,.mov,.webm"
          onChange={handleBannerChange}
        />
        {formData.bannerFiles && formData.bannerFiles.length > 0 && (
          <div>
            Selected: {formData.bannerFiles.map(f => f.name).join(', ')}
          </div>
        )}
      </div>
      
      <button type="submit">Tạo About</button>
    </form>
  );
};
```

#### Display Component
```tsx
const AboutDisplay: React.FC<{ about: About }> = ({ about }) => {
  return (
    <div>
      <h2>{about.schoolName}</h2>
      {about.website && <p>Website: <a href={about.website}>{about.website}</a></p>}
      {about.departmentName && <p>Khoa: {about.departmentName}</p>}
      {about.email && <p>Email: {about.email}</p>}
      {about.fanpage && <p>Fanpage: <a href={about.fanpage}>{about.fanpage}</a></p>}
      
      {about.logo && about.logo.length > 0 && (
        <div>
          <h3>Logo</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            {about.logo.map((logo, index) => (
              <div key={index}>
                <img src={logo.url} alt={logo.originalName} style={{ maxWidth: '100px' }} />
                <p>{logo.originalName} ({(logo.size / 1024).toFixed(1)} KB)</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {about.banner && about.banner.length > 0 && (
        <div>
          <h3>Banner</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {about.banner.map((banner, index) => (
              <div key={index}>
                {banner.type === 'image' ? (
                  <img src={banner.url} alt={banner.originalName} style={{ maxWidth: '300px' }} />
                ) : (
                  <video controls style={{ maxWidth: '300px' }}>
                    <source src={banner.url} type={banner.mimeType} />
                  </video>
                )}
                <p>{banner.originalName} ({(banner.size / 1024 / 1024).toFixed(1)} MB)</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {about.mapEmbedCode && (
        <div>
          <h3>Bản đồ</h3>
          <div dangerouslySetInnerHTML={{ __html: about.mapEmbedCode }} />
        </div>
      )}
    </div>
  );
};
```

---

## Important Notes

### File Upload Constraints
1. **Logo files**: Tối đa 5 files, mỗi file tối đa 5MB, chỉ accept images
2. **Banner files**: Tối đa 5 files, images (5MB), videos (100MB)
3. **File naming**: Hệ thống tự động generate unique filename với format: `about-{type}-{timestamp}-{random}.{ext}`
4. **Storage**: Files được lưu trong thư mục tương ứng `/uploads/about/logo/` hoặc `/uploads/about/banner/`

### JSON Structure
- Media metadata được lưu dưới dạng JSON arrays trong database
- Mỗi media object chứa đầy đủ thông tin: url, filename, originalName, size, mimeType, type, description
- Frontend có thể dễ dàng loop through arrays để display

### Security
- Authentication required cho tất cả operations trừ GET
- Role-based access control (Admin, Judge)
- File type validation
- File size validation
- Input validation với Zod schemas

### Error Handling
- Comprehensive error messages
- Proper HTTP status codes
- File upload error handling
- Validation error details

# 📎 Multiple Media Upload - Complete Summary

## 🎯 **Quick Overview**

Question module hỗ trợ upload **multiple files** với **mixed media types** (images + videos + audio) trong một request duy nhất.

---

## 🚀 **3 Cách Upload Media**

### 1️⃣ **Create Question với Media**
```
POST /api/questions
Content-Type: multipart/form-data
```

### 2️⃣ **Upload Media vào Question có sẵn**
```
POST /api/questions/:id/media  
Content-Type: multipart/form-data
```

### 3️⃣ **Update Question với Media mới**
```
PATCH /api/questions/:id
Content-Type: multipart/form-data
```

---

## 📋 **Postman Setup (Chi tiết)**

### **Method 1: Create với Multiple Files**

**URL**: `{{baseUrl}}/questions`  
**Method**: POST  
**Headers**: Content-Type sẽ tự động set thành `multipart/form-data`

**Body → form-data:**
```
Key                | Type | Value
-------------------|------|----------------------------------
defaultTime        | Text | 180
questionType       | Text | multiple_choice
content            | Text | <p>Analyze these media files</p>
options            | Text | ["Cat", "Dog", "Video", "Audio"]
correctAnswer      | Text | Cat
score              | Text | 20
difficulty         | Text | Beta
questionTopicId    | Text | 1
questionMedia      | File | [Select image1.jpg]
questionMedia      | File | [Select image2.png]
questionMedia      | File | [Select video1.mp4]
mediaAnswer        | File | [Select audio1.mp3]
```

### **Method 2: Upload vào Question có sẵn**

**URL**: `{{baseUrl}}/questions/31/media`  
**Method**: POST

**Body → form-data:**
```
Key    | Type | Value
-------|------|------------------
media  | File | [Select file1.jpg]
media  | File | [Select file2.png]
media  | File | [Select file3.mp4]
media  | File | [Select file4.mp3]
```

---

## 📁 **File Types & Limits**

| Media Type | Extensions | Max Size | Max Files |
|------------|------------|----------|-----------|
| **Images** | `.jpg, .png, .gif, .webp, .svg` | 5MB each | 5 total |
| **Videos** | `.mp4, .avi, .mov, .webm, .mkv` | 100MB each | 5 total |
| **Audio** | `.mp3, .wav, .ogg, .aac, .flac` | 20MB each | 5 total |

---

## ✅ **Success Response Example**

```json
{
  "success": true,
  "message": "Upload media thành công",
  "data": {
    "uploadedFiles": [
      {
        "type": "image",
        "url": "/uploads/questions/question-image-1749903959627-825321091.png",
        "filename": "question-image-1749903959627-825321091.png",
        "size": 15420,
        "mimeType": "image/png"
      },
      {
        "type": "video",
        "url": "/uploads/questions/question-video-1749903959627-825321092.mp4", 
        "filename": "question-video-1749903959627-825321092.mp4",
        "size": 2048576,
        "mimeType": "video/mp4"
      },
      {
        "type": "audio",
        "url": "/uploads/questions/question-audio-1749903959627-825321093.mp3",
        "filename": "question-audio-1749903959627-825321093.mp3", 
        "size": 512768,
        "mimeType": "audio/mpeg"
      }
    ],
    "errors": []
  }
}
```

---

## 🎯 **Key Points cho Postman**

### ✅ **DO - Làm đúng:**
- ✅ **Same field name**: Dùng `questionMedia` cho multiple files
- ✅ **Multiple rows**: Thêm nhiều dòng với cùng field name
- ✅ **Mixed types**: Upload images + videos + audio cùng lúc
- ✅ **File selection**: Select files từ computer của bạn
- ✅ **Text fields first**: Đặt text fields trước file fields

### ❌ **DON'T - Tránh:**
- ❌ **Different field names**: `questionMedia1`, `questionMedia2`
- ❌ **JSON body**: Dùng form-data, không phải raw JSON
- ❌ **Wrong Content-Type**: Để Postman tự set multipart/form-data
- ❌ **Too many files**: Không quá 5 files per request
- ❌ **Wrong file sizes**: Kiểm tra limits trước khi upload

---

## 🧪 **Test Sequence**

### **Step 1: Prepare Files**
```
📁 test-files/
├── 📸 small-image.jpg (1MB)
├── 📸 diagram.png (2MB) 
├── 🎥 tutorial.mp4 (50MB)
├── 🎵 narration.mp3 (5MB)
└── ❌ document.pdf (for error test)
```

### **Step 2: Test Valid Upload**
1. **Create Question** với 2 images + 1 video
2. **Verify Response** contains 3 uploadedFiles
3. **Check Files** exist in `/uploads/questions/`

### **Step 3: Test Additional Upload**
1. **Upload More Media** to existing question
2. **Verify Addition** (not replacement)

### **Step 4: Test Error Cases**
1. **File too large** (upload 10MB image)
2. **Invalid type** (upload PDF file)
3. **Too many files** (upload 6+ files)

---

## 🔍 **Debug Information**

### **Check Server Logs:**
```bash
tail -f logs/app.log
```

Look for these messages:
```
✅ "Uploading image file: filename.png, MIME: image/png"
✅ "File moved successfully from temp to permanent" 
✅ "Media uploaded successfully for question ID"
❌ "File filter error" (unsupported type)
❌ "File too large" (size exceeded)
```

### **Verify File System:**
```bash
# Check uploaded files
ls -la uploads/questions/

# Should be empty after upload
ls -la tmp/
```

---

## 📊 **Current Status**

- ✅ **Server Running**: Port 3000
- ✅ **Database**: 39 questions available
- ✅ **Upload System**: Fully functional
- ✅ **File Validation**: Working
- ✅ **Error Handling**: Comprehensive

**🎊 Ready to test multiple media upload in Postman!**

---

## 💡 **Pro Tips**

1. **Start Small**: Test with 1 file first, then multiple
2. **Check Logs**: Monitor server logs for debugging
3. **File Names**: Use simple names without spaces/special chars
4. **Save IDs**: Use Postman Tests to save question IDs automatically
5. **Environment**: Set up `{{questionId}}` variable for reuse

**🚀 Happy Multiple Media Testing!**

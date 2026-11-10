# Image Upload Middleware

File multer chung cho việc xử lý upload ảnh trong toàn bộ ứng dụng.

## Cấu trúc thư mục

```
src/middlewares/
├── imageUpload.ts          # Multer chung (file mới)
└── multer/
    ├── aboutMulter.ts      # Wrapper cho About module  
    └── uploadErrorHandler.ts
```

## Cách sử dụng

### 1. Sử dụng cấu hình có sẵn

```typescript
import { 
  aboutImageUpload,
  userAvatarUpload,
  contestImageUpload,
  schoolImageUpload,
  sponsorImageUpload
} from "@/middlewares/imageUpload";

// Upload single image
app.post("/api/about/:id", 
  aboutImageUpload.single("logo"),
  controller.updateAbout
);

// Upload multiple fields
app.post("/api/about/:id", 
  aboutImageUpload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 }
  ]),
  controller.updateAbout
);

// Upload multiple images
app.post("/api/contest/:id/gallery", 
  contestImageUpload.multiple("images", 10),
  controller.uploadGallery
);
```

### 2. Tạo cấu hình tùy chỉnh

```typescript
import { 
  createImageUploader, 
  uploadSingleImage,
  UploadConfig 
} from "@/middlewares/imageUpload";

// Cấu hình cho news module
const newsConfig: UploadConfig = {
  uploadDir: "news",
  filePrefix: "news",
  maxFileSize: 3 * 1024 * 1024, // 3MB
  allowedTypes: /jpeg|jpg|png|webp/,
  allowedMimeTypes: /^image\/(jpeg|jpg|png|webp)$/,
};

// Sử dụng
const uploadNewsImage = uploadSingleImage(newsConfig, "thumbnail");
app.post("/api/news", uploadNewsImage, controller.createNews);
```

### 3. Utility functions

```typescript
import { 
  deleteFile,
  deleteFiles,
  getFileUrl,
  getFilePath,
  getFileNameFromUrl,
  fileExists,
  getFileInfo
} from "@/middlewares/imageUpload";

// Xóa file cũ khi update
if (oldImageUrl) {
  const fileName = getFileNameFromUrl(oldImageUrl);
  if (fileName) {
    const filePath = getFilePath("about", fileName);
    deleteFile(filePath);
  }
}

// Tạo URL cho frontend
const imageUrl = getFileUrl("about", "about-123456789.jpg");
// Result: "/uploads/about/about-123456789.jpg"

// Kiểm tra file tồn tại
const exists = fileExists(getFilePath("about", "image.jpg"));

// Lấy thông tin file
const info = getFileInfo(filePath);
console.log(info?.size, info?.createdAt);
```

## Cấu hình có sẵn

### ABOUT
- **uploadDir**: `"about"`
- **filePrefix**: `"about"`
- **maxFileSize**: 5MB
- **allowedTypes**: jpeg, jpg, png, gif, webp

### USER_AVATAR
- **uploadDir**: `"users/avatars"`
- **filePrefix**: `"avatar"`
- **maxFileSize**: 2MB
- **allowedTypes**: jpeg, jpg, png, webp

### CONTEST
- **uploadDir**: `"contests"`
- **filePrefix**: `"contest"`
- **maxFileSize**: 5MB
- **allowedTypes**: jpeg, jpg, png, gif, webp

### SCHOOL
- **uploadDir**: `"schools"`
- **filePrefix**: `"school"`
- **maxFileSize**: 5MB
- **allowedTypes**: jpeg, jpg, png, gif, webp

### SPONSOR
- **uploadDir**: `"sponsors"`
- **filePrefix**: `"sponsor"`
- **maxFileSize**: 5MB
- **allowedTypes**: jpeg, jpg, png, gif, webp, svg

## Migration từ code cũ

### Trước (aboutMulter.ts)
```typescript
import { uploadAboutImages, deleteOldFile, getFileUrl, getFilePath } from "@/middlewares/multer/aboutMulter";
```

### Sau (vẫn hoạt động)
```typescript
import { uploadAboutImages, deleteOldFile, getAboutFileUrl, getAboutFilePath } from "@/middlewares/multer/aboutMulter";
```

### Hoặc sử dụng trực tiếp
```typescript
import { aboutImageUpload, deleteFile, getFileUrl, getFilePath } from "@/middlewares/imageUpload";
```

## Error Handling

```typescript
import { handleUploadError } from "@/middlewares/multer/uploadErrorHandler";

app.post("/api/upload", 
  (req, res, next) => {
    uploadMiddleware(req, res, (error) => {
      if (error) {
        return handleUploadError(error, req, res, next);
      }
      next();
    });
  },
  controller.handleUpload
);
```

## Best Practices

1. **Sử dụng cấu hình có sẵn** cho các module phổ biến
2. **Tạo cấu hình tùy chỉnh** cho các module đặc biệt
3. **Luôn xóa file cũ** khi update
4. **Kiểm tra file tồn tại** trước khi xóa
5. **Sử dụng proper error handling** với uploadErrorHandler
6. **Validate file types** phù hợp với mục đích sử dụng

## Ví dụ thực tế

### User Avatar Upload
```typescript
// routes/user.routes.ts
import { userAvatarUpload } from "@/middlewares/imageUpload";

userRouter.patch(
  "/:id/avatar",
  authenticate,
  userAvatarUpload.single("avatar"),
  UserController.updateAvatar
);

// controller/user.controller.ts
static async updateAvatar(req: Request, res: Response) {
  const userId = req.params.id;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // Delete old avatar
  const user = await UserService.getUserById(userId);
  if (user.avatar) {
    const oldFileName = getFileNameFromUrl(user.avatar);
    if (oldFileName) {
      const oldFilePath = getFilePath("users/avatars", oldFileName);
      deleteFile(oldFilePath);
    }
  }

  // Update user with new avatar URL
  const avatarUrl = getFileUrl("users/avatars", file.filename);
  await UserService.updateUser(userId, { avatar: avatarUrl });
  
  res.json({ success: true, avatar: avatarUrl });
}
```

### Contest Gallery Upload
```typescript
// routes/contest.routes.ts
import { contestImageUpload } from "@/middlewares/imageUpload";

contestRouter.post(
  "/:id/gallery",
  authenticate,
  contestImageUpload.multiple("images", 10),
  ContestController.uploadGallery
);

// controller/contest.controller.ts  
static async uploadGallery(req: Request, res: Response) {
  const contestId = req.params.id;
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  const imageUrls = files.map(file => 
    getFileUrl("contests", file.filename)
  );

  await ContestService.addGalleryImages(contestId, imageUrls);
  
  res.json({ 
    success: true, 
    images: imageUrls,
    count: files.length 
  });
}
```

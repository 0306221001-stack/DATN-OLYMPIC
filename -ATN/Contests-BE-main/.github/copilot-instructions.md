# Hướng dẫn dành cho GitHub Copilot - Dự án Contest BE

Chào mừng Copilot! Đây là bản hướng dẫn giúp bạn tạo ra code chất lượng cao, nhất quán và "chuẩn chỉ" cho dự án backend quản lý cuộc thi này. **Vui lòng tuân thủ nghiêm ngặt các quy tắc dưới đây.**

---

## 1. Tổng quan về Công nghệ (Tech Stack Overview)

- **Ngôn ngữ**: TypeScript
- **Framework**: Express.js
- **ORM**: Prisma (kết nối PostgreSQL/MySQL)
- **Validation**: Zod
- **Logging**: Winston
- **Xác thực**: JSON Web Tokens (JWT)
- **Bảo mật**: Helmet, CORS, bcrypt

---

## 2. Cấu trúc Dự án Bất biến (The Immutable Project Structure)

Luôn luôn tuân thủ cấu trúc module-based. Mỗi module tính năng **phải** nằm trong `src/modules/` và bao gồm 4 file cốt lõi:

- `*.schema.ts`: **CHỈ** định nghĩa Zod schema và các type TypeScript liên quan.
- `*.service.ts`: **CHỈ** chứa logic nghiệp vụ và tương tác với database (Prisma). Đây là nơi duy nhất được phép gọi Prisma.
- `*.controller.ts`: **CHỈ** xử lý request và response. Nó gọi các hàm từ Service, xử lý lỗi và gửi phản hồi bằng response helpers. **TUYỆT ĐỐI KHÔNG** chứa logic nghiệp vụ hay gọi Prisma trực tiếp.
- `*.routes.ts`: **CHỈ** định nghĩa các endpoint API, áp dụng middleware (xác thực, validation).

---

## 3. Các Quy tắc Vàng (Golden Rules)

Đây là những quy tắc quan trọng nhất. **KHÔNG BAO GIỜ** phá vỡ chúng.

### ⭐ Quy tắc 1: Validation là Bắt buộc

Mọi dữ liệu đầu vào từ client (body, query, params) **PHẢI** được validate bằng Zod schema từ file `*.schema.ts`.

- Sử dụng các middleware `validateBody`, `validateQuery`, `validateParams` từ `src/utils/validation.ts`.

**Ví dụ:**
```typescript
// src/modules/user/user.routes.ts
import { validateBody, validateParams } from "@/utils/validation";
import { CreateUserSchema, UserIdSchema } from "./user.schema";

userRouter.post("/", validateBody(CreateUserSchema), UserController.createUser);
userRouter.delete("/:id", validateParams(UserIdSchema), UserController.deleteUser);
```

---

### ⭐ Quy tắc 2: Tương tác Database chỉ trong Service

Chỉ có các file `*.service.ts` được phép import và sử dụng Prisma. Controller và các nơi khác **KHÔNG** được gọi Prisma trực tiếp. Điều này đảm bảo logic nghiệp vụ được tập trung.

---

### ⭐ Quy tắc 3: Xử lý Lỗi có Hệ thống

- Luôn sử dụng `try...catch` trong Controller.
- Trong Service, khi có lỗi nghiệp vụ (ví dụ: "User not found"), hãy `throw new CustomError(...)` từ `src/middlewares/errorHandler.ts`.
- Controller sẽ bắt lỗi này và trả về response phù hợp. **KHÔNG** dùng `throw new Error("...")` chung chung.

**Ví dụ:**
```typescript
// src/modules/user/user.service.ts
static async getUserById(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    // DÙNG CustomError cho lỗi nghiệp vụ
    throw new CustomError("Không tìm thấy người dùng", 404, "USER_NOT_FOUND");
  }
  return user;
}
```

---

### ⭐ Quy tắc 4: Luôn dùng Response Helpers

Sử dụng các hàm `successResponse`, `errorResponse`, `paginatedResponse` từ `src/utils/response.ts` để đảm bảo định dạng response nhất quán. **KHÔNG** tự tạo object JSON trong `res.json()`.

**Ví dụ:**
```typescript
// src/modules/user/user.controller.ts
res.status(200).json(successResponse(user, "Lấy người dùng thành công"));
```

---

### ⭐ Quy tắc 5: Logging Chi tiết

Sử dụng logger từ `src/utils/logger.ts`.

- `logger.info()`: Cho các hành động thành công (ví dụ: User created successfully).
- `logger.warn()`: Cho các cảnh báo, lỗi có thể lường trước (ví dụ: Invalid login attempt).
- `logger.error()`: Cho các lỗi không mong muốn, lỗi hệ thống.
- **KHÔNG** sử dụng `console.log`.

---

### ⭐ Quy tắc 6: Bảo mật là trên hết

- **Xác thực**: Sử dụng middleware `authenticate` từ `src/middlewares/auth.ts` cho các route cần bảo vệ.
- **Phân quyền**: Sử dụng middleware `role('Admin', 'Judge')` cho các route yêu cầu quyền cụ thể.
- **Mật khẩu**: Luôn băm mật khẩu bằng bcrypt trước khi lưu vào database.

---

## 4. Quy trình làm việc khi thêm Module mới

Khi tạo một module mới (ví dụ: sponsor), hãy làm theo các bước sau:

1. **Cập nhật schema.prisma**: Nếu cần, thêm model `Sponsor`. Chạy `npm run prisma:generate`.
2. **Tạo thư mục**: `src/modules/sponsor`.
3. **Tạo sponsor.schema.ts**:
   - Định nghĩa các Zod schema: `CreateSponsorSchema`, `UpdateSponsorSchema`, `SponsorIdSchema`, ...
   - Export các type tương ứng: `CreateSponsorInput`, ...
4. **Tạo sponsor.service.ts**:
   - Viết các hàm logic: `createSponsor`, `getSponsorById`, ...
   - Tất cả các hàm này sẽ tương tác với `prisma.sponsor`.
5. **Tạo sponsor.controller.ts**:
   - Viết các hàm handler: `createSponsor`, `getSponsorById`, ...
   - Mỗi hàm sẽ gọi hàm tương ứng trong `SponsorService`.
   - Sử dụng logger và response helpers.
6. **Tạo sponsor.routes.ts**:
   - Định nghĩa các endpoint (`/`, `/:id`, ...).
   - Áp dụng các middleware `authenticate`, `role`, và các middleware validation (`validateBody`, ...).
7. **Đăng ký route trong app.ts**:
   ```typescript
   import { sponsorRouter } from '@/modules/sponsor';
   app.use('/api/sponsors', sponsorRouter);
   ```

---

## 5. Những điều cần TRÁNH (Anti-patterns)

- **KHÔNG** viết business logic trong file controller.
- **KHÔNG** gọi `res.json()` với object tự tạo.
- **KHÔNG** bỏ qua lỗi với block `catch` trống.
- **KHÔNG** viết các truy vấn SQL thô (raw SQL) trừ khi thực sự cần thiết và phải được đóng gói cẩn thận trong service.
- **KHÔNG** lặp lại code. Nếu một đoạn logic được dùng nhiều nơi, hãy tạo một hàm tiện ích trong `src/utils`.

---
# Socket.IO Module - Contest Backend

## Tổng quan

Module Socket.IO này được thiết kế để xử lý thời gian thực trong hệ thống quản lý cuộc thi. Nó tuân thủ nghiêm ngặt các quy tắc kiến trúc của dự án và cung cấp cấu trúc có thể mở rộng.

## Cấu trúc Thư mục

```
src/socket/
├── index.ts                               # Điểm khởi tạo chính
├── SocketService.ts                       # Singleton service để truy cập IO instance
├── namespaces/
│   └── matchControl.namespace.ts          # Namespace cho điều khiển trận đấu
└── events/
    └── question.events.ts                 # Xử lý sự kiện câu hỏi
```

## Tính năng

### 1. Xác thực JWT

- Tất cả kết nối Socket.IO phải có JWT token hợp lệ
- Token được gửi qua `socket.handshake.auth.token`
- Thông tin user được gắn vào socket object sau khi xác thực

### 2. Namespace Organization

- `/match-control`: Dành cho điều khiển và theo dõi trận đấu
- Có thể mở rộng thêm namespace khác như `/admin`, `/public`

### 3. Room Management

- Client có thể join/leave room theo matchId
- Format room: `match-${matchId}`
- Hỗ trợ acknowledgement callback

### 4. Event Validation

- Sử dụng Zod để validate payload của các event
- Đảm bảo type safety và data integrity

## Cách sử dụng

### Từ Client (Frontend)

```javascript
import { io } from "socket.io-client";

// Kết nối với token xác thực
const socket = io("/match-control", {
  auth: {
    token: "your-jwt-token",
  },
});

// Join room của trận đấu
socket.emit("joinMatchRoom", 123, response => {
  console.log(response); // { success: true, message: "..." }
});

// Lắng nghe sự kiện câu hỏi mới
socket.on("newQuestionDisplayed", data => {
  console.log("New question:", data.questionOrder);
});

// Hiển thị câu hỏi tiếp theo (chỉ dành cho judge/admin)
socket.emit("showNextQuestion", {
  matchId: 123,
  questionOrder: 1,
});
```

### Từ Backend (Server)

```typescript
import { socketService } from "@/socket/SocketService";

// Gửi sự kiện đến một room cụ thể
socketService.emitToRoom("match-123", "scoreUpdated", {
  teamId: 1,
  newScore: 100,
});
```

## Mở rộng

### Thêm Event mới

1. Tạo file trong `src/socket/events/` (ví dụ: `score.events.ts`)
2. Import và register trong namespace tương ứng
3. Sử dụng Zod để validate payload

### Thêm Namespace mới

1. Tạo file trong `src/socket/namespaces/`
2. Import và đăng ký trong `src/socket/index.ts`
3. Thiết lập logic xác thực nếu cần

## Bảo mật

- ✅ JWT Authentication cho mọi kết nối
- ✅ Validation payload với Zod
- ✅ Logging chi tiết cho audit trail
- ✅ Room isolation để tránh data leakage

## Dependencies

```json
{
  "socket.io": "^4.x.x",
  "@types/socket.io": "^3.x.x"
}
```

## Lưu ý quan trọng

1. **Không gọi Prisma trực tiếp**: Nếu cần data từ database, gọi qua Service layer
2. **Luôn validate input**: Sử dụng Zod schema cho mọi event payload
3. **Error handling**: Wrap các xử lý trong try-catch và log errors
4. **Performance**: Tránh emit quá nhiều event, sử dụng batching nếu cần
5. **Testing**: Viết unit test cho các event handler quan trọng

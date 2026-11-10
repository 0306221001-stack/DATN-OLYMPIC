# Hướng dẫn cho nhóm: test hệ thống và build iOS

## 1. Mô hình chạy khi cả nhóm cùng test

- **Một người** (chủ trận) chạy: MySQL, backend, web admin, và đường hầm. Người này điều khiển trận bằng web admin.
- **Những người còn lại** chỉ cài app và nhập địa chỉ máy chủ do chủ trận đưa. Họ không cần chạy backend.

Web admin chạy ở `localhost:5173` trên máy chủ trận nên chỉ người đó dùng được (xem mục 4 nếu muốn mở rộng).

## 2. Mở đường hầm (chủ trận làm)

Đường hầm cho người ở ngoài mạng vào được backend của chủ trận.

1. Tải `cloudflared` cho Windows: https://github.com/cloudflare/cloudflared/releases/latest (file `cloudflared-windows-amd64.exe`), đổi tên thành `cloudflared.exe`, đặt vào thư mục `tools\cloudflared\` (thư mục này không đưa lên git) hoặc thêm vào PATH.
2. Bật MySQL, chạy backend: `cd Contests-BE-main` rồi `npm run dev`.
3. Chạy `scripts\mo_duong_ham.bat`, lấy địa chỉ dạng `https://xxxx.trycloudflare.com` trong khung hiện ra.
4. Kiểm tra: mở `https://xxxx.trycloudflare.com/api/auth/profile`, thấy "Access token is required" là thông.
5. Gửi địa chỉ cho nhóm. Họ vào app, bấm **Đổi** ở dòng "Máy chủ", dán địa chỉ (không thêm `/api`), bấm **Kiểm tra**, **Lưu**, đóng hẳn app và mở lại.

**Hạn chế:** địa chỉ này thuộc loại tạm thời, **đổi mỗi lần mở lại** và chết khi tắt cửa sổ. Mỗi lần đổi phải gửi lại địa chỉ mới.

### Muốn địa chỉ cố định, không phải gửi lại

Hai hướng, đều cần quyết định của nhóm:

- **Tunnel có tên của Cloudflare:** cần tài khoản Cloudflare và một tên miền của nhóm. Địa chỉ cố định (ví dụ `api.ten-mien.com`) nhưng vẫn phải chạy máy chủ trên máy chủ trận.
- **Đưa backend và MySQL lên máy chủ trực tuyến** (VPS hoặc dịch vụ như Railway, Render): máy chủ chạy 24/7, không phụ thuộc máy ai. Khi đó build app với `--dart-define=SERVER_URL=https://...` hoặc nhập địa chỉ một lần trong app. Cần xử lý biến môi trường, cookie qua HTTPS và CORS.

## 3. Build iOS (người có máy Mac làm)

Phần iOS đã có sẵn trong `Contests-Mobile-app/ios` (mã định danh `vn.edu.caothang.rungchuongvang`, tên hiển thị "Rung chuông vàng"). **Chưa ai build thử trên iOS**, nên có thể phát sinh lỗi cần sửa.

Yêu cầu: máy Mac, Xcode, Flutter, CocoaPods, tài khoản Apple (miễn phí đủ để chạy thử trên máy của chính mình).

```
git clone https://github.com/0306221001-stack/-ATN.git
cd -ATN/Contests-Mobile-app
flutter pub get
cd ios && pod install && cd ..
open ios/Runner.xcworkspace
```

Trong Xcode: chọn target **Runner** → tab **Signing & Capabilities** → chọn Team (tài khoản Apple của bạn). Nếu báo trùng bundle id, đổi sang một id khác. Sau đó:

```
flutter run -d <ma-thiet-bi-hoac-simulator>
```

Chạy trên Simulator được; chạy trên iPhone thật cần cắm cáp và bật chế độ nhà phát triển.

Ứng dụng cho phép kết nối HTTP (không chỉ HTTPS) để thử trong mạng nội bộ (`NSAllowsArbitraryLoads` trong `ios/Runner/Info.plist`). Khi phát hành lên App Store nên bỏ và dùng HTTPS.

Nếu build lỗi, ghi lại thông báo lỗi gửi cho người phụ trách app để sửa.

## 4. Muốn người khác dùng được web admin

Cần nhiều bước và chưa được kiểm thử:
1. Mở thêm đường hầm cho web (cổng 5173).
2. Đổi `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_MEDIA_URL` trong `Contests-FE-main/.env` thành địa chỉ đường hầm backend.
3. Thêm địa chỉ web vào `CORS_ORIGIN` trong `.env` backend.
4. Cookie đăng nhập chỉ chạy xuyên miền khi `NODE_ENV=production` và có HTTPS.

Hệ thống chỉ cho **một phiên đăng nhập cho mỗi tài khoản**: hai người dùng chung `admin` sẽ đăng xuất lẫn nhau.

## 5. Tài khoản thử

Mật khẩu `123456` (thử thật với `student_10104`). Thí sinh trận "Vòng loại - Trận 1": `student_10104`, `student_11905`, `student_12303`, `student_12105`, `student_10602`. Trọng tài: `judge1` (Nhóm A), `judge2` (Nhóm D). Admin: `admin` / `admin123`.
Mỗi tài khoản chỉ đăng nhập một nơi một lúc, mỗi người dùng một tài khoản riêng.

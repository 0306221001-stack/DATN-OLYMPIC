# Hướng dẫn chạy hệ thống "Rung chuông vàng"

Hệ thống thi trắc nghiệm theo thời gian thực, gồm ba thành phần:

| Thành phần | Thư mục | Công nghệ | Người dùng |
|---|---|---|---|
| Backend (API + Socket.IO) | `Contests-BE-main` | Node.js, Express, Prisma, MySQL | – |
| Web quản trị | `Contests-FE-main` | React, Vite | Admin điều khiển trận |
| **Ứng dụng di động** (trọng tâm đồ án) | `Contests-Mobile-app` | Flutter (Android, iOS, web) | Thí sinh, Trọng tài |

Ứng dụng di động có: đăng nhập/đăng ký/quên mật khẩu, danh sách trận, phòng thi thời gian thực (nhận câu hỏi, đồng hồ đếm ngược, nộp đáp án), chống gian lận khi rời ứng dụng, cứu trợ, màn điều khiển cho Trọng tài, hồ sơ, giải thưởng, nhà tài trợ.

## 1. Cách nhanh nhất để xem thử (chỉ cần điện thoại Android)

1. Cài file `app-release.apk` lên điện thoại Android (cho phép "cài ứng dụng không rõ nguồn gốc").
2. Máy chạy backend và điện thoại phải **cùng mạng Wi-Fi**.
3. Mở app, ở màn hình đăng nhập bấm **Đổi** cạnh dòng "Máy chủ", nhập `IP-máy-chạy-backend:3000` (ví dụ `192.168.1.20:3000`), bấm **Kiểm tra** rồi **Lưu**, đóng hẳn app và mở lại.

Muốn có IP của máy: Windows mở Command Prompt, gõ `ipconfig`, lấy dòng *IPv4 Address* của Wi-Fi. Máy chạy backend cần mở cổng 3000 trong tường lửa Windows.

## 2. Yêu cầu cài đặt để chạy toàn bộ hệ thống

- Node.js 18 trở lên, npm
- MySQL hoặc MariaDB (đã thử với XAMPP, MariaDB 10.4)
- Flutter 3.x (chỉ cần nếu muốn chạy/build app từ mã nguồn)

## 3. Các bước chạy

### Bước 1: Cơ sở dữ liệu
1. Bật MySQL (XAMPP → Start MySQL), mở `http://localhost/phpmyadmin`.
2. Tạo database tên `contests_db` (bảng mã `utf8mb4_unicode_ci`).
3. Chọn database này, tab **Nhập (Import)** → chọn file `contests_db.sql`.
4. Tab **SQL** → dán và chạy nội dung file `chuan_bi_du_lieu.sql` (sửa các điểm của dữ liệu mẫu, xem ghi chú trong file).

### Bước 2: Backend
```
cd Contests-BE-main
copy .env.example .env        (macOS/Linux: cp .env.example .env)
```
Mở `.env`, kiểm tra `DATABASE_URL` (XAMPP mặc định `mysql://root:@localhost:3306/contests_db`) và đặt `JWT_SECRET` là chuỗi ngẫu nhiên dài. Rồi:
```
npm install
npm run dev
```
Thành công khi terminal báo server chạy cổng 3000. Kiểm tra: mở `http://localhost:3000/api/auth/profile` phải thấy "Access token is required".

### Bước 3: Web quản trị
```
cd Contests-FE-main
copy .env.example .env
npm install
npm run dev
```
Mở `http://localhost:5173/login`.

### Bước 4: Ứng dụng thí sinh/trọng tài
- **Trên điện thoại Android:** dùng `app-release.apk` như mục 1.
- **Trên Chrome (từ mã nguồn):**
  ```
  cd Contests-Mobile-app
  flutter pub get
  flutter run -d chrome --web-port=5000
  ```
  Bắt buộc dùng cổng 5000 và địa chỉ `localhost` (không dùng `127.0.0.1`), vì backend chỉ cho phép hai địa chỉ này trong `CORS_ORIGIN`.
- **Build lại APK:** `flutter build apk --release --dart-define=APP_ENV=production --dart-define=SERVER_URL=http://<IP>:3000`

## 4. Tài khoản thử

| Vai trò | Tên đăng nhập | Mật khẩu | Dùng ở |
|---|---|---|---|
| Admin | `admin` | `admin123` | Web quản trị |
| Thí sinh | `student_10104` | `123456` | App (đã có trong trận 2) |
| Trọng tài | `judge2` | `123456` | App (phụ trách nhóm có thí sinh `student_10104` ở trận 2) |

Dữ liệu mẫu còn nhiều tài khoản thí sinh dạng `student_10101`, `student_10102`, … (mật khẩu theo cùng quy ước của dữ liệu mẫu là `123456`); phần đã được thử đầy đủ là `student_10104`.

## 5. Kịch bản thử một trận (khoảng 5 phút)

> **Quan trọng:** mở web admin trong **cửa sổ ẩn danh**, app thí sinh ở cửa sổ thường. Hai bên dùng chung cookie đăng nhập của trình duyệt nên để chung cửa sổ sẽ bị đăng xuất lẫn nhau.

1. Admin: vào `http://localhost:5173/admin/contest/tin-hoc-tre-toan-quoc-2025/control/tran-2`. Ô "Socket.IO" phải xanh "Đã kết nối".
2. Thí sinh: đăng nhập `student_10104`, bấm thẻ **Vòng loại - Trận 2** để vào phòng chờ.
3. Admin: mục **Thi online** bấm **Bắt Đầu Trận**. Ở cột xanh bên trái bấm số **2** rồi số **1**, sau đó bấm **Show** và **Play** (phần "Điều khiển thời gian").
4. Thí sinh thấy Câu 1 với 4 đáp án và đồng hồ. Chọn `2x` rồi **Gửi đáp án**.
5. Hết giờ thí sinh thấy kết quả. Trả lời sai sẽ bị loại; Admin bấm **Cứu trợ** để đưa thí sinh trở lại.
6. Chống gian lận: khi đang có câu hỏi, chuyển sang ứng dụng khác rồi quay lại: cảnh báo 1/3, đủ 3 lần thì bị cấm thi.
7. Trọng tài: đăng nhập `judge2` trên một thiết bị/cửa sổ khác, vào cuộc thi → trận, đổi trạng thái thí sinh (Xác nhận 1/2) và **Chốt câu**.

Muốn thử lại trận từ đầu: chạy lại file `chuan_bi_du_lieu.sql`.

## 6. Giới hạn đã biết và điều chưa kiểm tra

- **iOS:** mã nguồn dùng chung nhưng chưa build/thử vì cần máy Mac. Đã chạy thật trên Chrome và Android.
- **Quên mật khẩu bằng OTP** cần cấu hình SMTP thật trong `.env` (`EMAIL_*`); không có thì chức năng này báo lỗi, các chức năng khác không bị ảnh hưởng.
- Chỉ một phiên đăng nhập cho mỗi tài khoản: đăng nhập ở nơi khác sẽ đăng xuất nơi cũ (do thiết kế của backend).
- Backend không có nút kết thúc trận trên web admin; muốn kết thúc, đổi trạng thái trận trong cơ sở dữ liệu (`UPDATE matches SET status='finished' WHERE id=2;`).
- Dữ liệu mẫu có nhà tài trợ trỏ tới file ảnh không tồn tại nên app hiện biểu tượng thay cho logo.
- APK ký bằng khóa tự tạo để cài thử, chưa phải bản phát hành lên cửa hàng ứng dụng. Kết nối dùng HTTP trong mạng nội bộ.

## 7. Cấu trúc mã nguồn ứng dụng di động

```
Contests-Mobile-app/lib
├─ core/        cấu hình, gọi API (Dio), Socket.IO, router + kiểm soát đăng nhập
└─ features/
   ├─ auth/     đăng nhập, đăng ký, quên mật khẩu
   ├─ match/    danh sách trận, phòng thi thời gian thực (thí sinh)
   ├─ judge/    danh sách cuộc thi/trận, điều khiển trận (trọng tài)
   ├─ rescue/   giao diện bị loại/bị cấm/được cứu trợ
   ├─ profile/  hồ sơ, giải thưởng, nhà tài trợ
   └─ settings/ đổi địa chỉ máy chủ
```
Mỗi tính năng chia `data` (gọi API/socket), `domain` (mô hình), `presentation` (giao diện). Quản lý trạng thái bằng Riverpod. Chạy kiểm tra: `flutter analyze` và `flutter test` (52 bài test).

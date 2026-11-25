# CLAUDE.md – Rung chuông vàng (Mobile: Student + Judge)

App Flutter (iOS/Android, đang chạy thử trên Chrome) cho Thí sinh và Trọng tài. Backend: `../Contests-BE-main` (Express/Prisma/Socket.IO). Web tham chiếu: `../Contests-FE-main`.
Giao diện và thông báo luôn bằng tiếng Việt.

## Stack
Flutter/Dart, flutter_riverpod 2.x (provider viết tay, không codegen), go_router (Auth Guard), Dio (interceptor tự gắn cookie và tự refresh), flutter_secure_storage, socket_io_client 2.0.3.

## Quy tắc
- Feature-first: `lib/features/<feature>/(data, domain, presentation)`; hạ tầng chung ở `lib/core`.
- Mọi hàm service/repository có try-catch, lỗi quy về `ApiException` (message tiếng Việt, hiển thị thẳng cho người dùng). UI luôn có đủ Loading và Error.
- Code đầy đủ, không rút gọn, không `// TODO`, không `// ignore`. `flutter analyze` phải sạch.
- Giữ phong cách code hiện có: khai báo kiểu tường minh, `const` khi có thể, doc comment tiếng Việt.

## Backend – điểm cần nhớ
- Base URL `http://localhost:3000`, prefix `/api`. Chỉ xác thực bằng cookie httpOnly `accessToken` (không đọc header Authorization), cả REST lẫn Socket.IO handshake (`handshake.headers.cookie`).
- Web: không tự đặt/đọc cookie được → Dio bật `withCredentials`; socket dùng cookie trình duyệt. Mobile: tự gắn header `Cookie` từ secure storage (`TokenStorage.buildCookieHeader`).
- Chạy web: `flutter run -d chrome --web-port=5000`, dùng `localhost` (không `127.0.0.1`); `CORS_ORIGIN` của BE phải chứa `http://localhost:5000`.
- Refresh: `GET /api/auth/refresh-token` (cookie `refreshToken`). 401 `USER_NOT_FOUND_OR_INACTIVE` = tài khoản bị khóa; `INVALID_OR_EXPIRED_TOKEN` = đăng nhập nơi khác.
- Lỗi validate: `error.details: [{field, message}]`. Envelope thành công: `{success, message, data, timestamp}`.
- Thí sinh đăng nhập được nhưng báo "Không tìm thấy thông tin thí sinh trong cuộc thi" nếu chưa có trong bảng contestants – hành vi của BE, không phải lỗi app.
- Dữ liệu thử: `student_10104 / 123456`, `judge1 / 123456`. Gửi OTP cần SMTP của BE.
- Tài liệu `docs/API_Anwser.md`, `docs/PLAN_REALTIME_ANSWERS.md` của BE đã lỗi thời; tin vào code (`src/socket`, `src/modules`) và FE web.

## Realtime (Step 3)
- Namespace: Student `/student`, Judge `/match-control`.
- Student phải vào cả room slug (`student:joinMatch {matchSlug}`) lẫn room id (`joinMatchRoom matchId`).
- Trạng thái trận BE: `upcoming | ongoing | finished`.
- Không có REST lấy câu hỏi cho student; câu hỏi đến qua `match:questionShown`. Đáp án gửi `POST /api/results/submit-answer` (sai là bị loại ngay → chỉ hiện kết quả khi hết giờ).
- App không emit `timer:*`; server là nguồn đồng hồ.

## Lưu ý build
- Android release cần quyền INTERNET và cho phép cleartext nếu dùng HTTP.
- `Env.serverUrl` không còn ném lỗi khi thiếu `SERVER_URL`: dùng địa chỉ mặc định để app vẫn mở được và người dùng đổi địa chỉ ở màn hình đăng nhập.

## Chống gian lận và cứu trợ (Step 4)
- `WaitingRoomScreen` quan sát `AppLifecycleState`: `paused`/`hidden` = rời app = 1 vi phạm (`MatchController.onAppLeft`); `inactive` bị bỏ qua. Chỉ giám sát khi đang có câu hỏi, chưa hết giờ, chưa bị loại/cấm.
- Đủ `maxViolations` (3) lần: khóa thí sinh ngay (`banned`) rồi `POST /api/results/ban-contestant` (`violationType: anti_cheat_multiple_violations`, `reason` ≥ 10 ký tự, `bannedBy: ANTI_CHEAT_SYSTEM`). `BAN_FAILED` (đã bị cấm) coi như thành công.
- Cứu trợ do Admin làm; app nhận `student:rescued` (BE gửi lẫn id thí sinh và số báo danh) → `rescued`, gỡ cấm và xóa số lần vi phạm. `RescuePanel` (features/rescue) hiển thị trạng thái bị loại/bị cấm/được cứu.
- Backend quirks đã gặp: seed không tạo `matches.slug` và `screen_controls`; `student:getQuestion` từng trả phương án rỗng (đã sửa); `student:confirmStart` ghi đè trạng thái vô điều kiện nên chỉ gọi khi `not_started`.

## Đóng gói và cấu hình máy chủ
- Địa chỉ Backend: người dùng đổi ngay ở màn hình đăng nhập ("Máy chủ: ... Đổi"), lưu bằng `ServerSettings` (secure storage), nạp trong `main()` trước `runApp`. Ưu tiên: địa chỉ đã lưu > `--dart-define=SERVER_URL` > mặc định máy phát triển. Đổi xong phải đóng hẳn và mở lại app.
- Android: `applicationId = vn.edu.caothang.rungchuongvang`; release ký bằng `android/app/upload-keystore.jks` đọc từ `android/key.properties` (đã nằm trong .gitignore). **Sao lưu hai file này**: mất khóa thì không cập nhật được app đã cài/phát hành.
- Icon sinh từ `assets/icon/*.png` bằng `dart run flutter_launcher_icons`.
- Build APK: `flutter build apk --release --dart-define=APP_ENV=production --dart-define=SERVER_URL=http://<IP>:3000`.
- Socket tự nối lại không giới hạn và nối lại khi app quay về từ nền (`SocketConnection.reconnectIfNeeded`).

## H? so, gi?i thu?ng, nh� t�i tr? (Step 5)
- `/account/profile` (`ProfileScreen`): th� sinh c� 3 th? H? so / Gi?i thu?ng / Nh� t�i tr?; tr?ng t�i ch? c� H? so. API c�ng khai: `GET /api/awards/contest/:slug` v� `GET /api/sponsors/contest/:slug` (tr? `{awards|sponsors, pagination}`). ?nh l� du?ng d?n tuong d?i `/uploads/...` n�n gh�p v?i `Env.serverUrl` (`resolveMediaUrl`).
- V�o m�n h? so b?ng bi?u tu?ng t�i kho?n ? thanh tr�n c?a danh s�ch tr?n (th� sinh) v� danh s�ch cu?c thi (tr?ng t�i).


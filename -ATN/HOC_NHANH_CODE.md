# Học nhanh dự án "Rung chuông vàng" (dành cho người chưa biết code)

> Tài liệu cá nhân để chuẩn bị bảo vệ/demo. Không nộp cho thầy.

## 0. Nguyên tắc buổi tối nay

1. **KHÔNG sửa code trước giờ demo.** Mỗi lần sửa là phải build lại, dễ phát sinh lỗi mới. Chỉ được đổi *cấu hình* (địa chỉ máy chủ trong app, câu SQL đặt lại trận).
2. Chạy thử đúng kịch bản demo ít nhất 2 lần.
3. Chuẩn bị video quay sẵn và bản chạy trên Chrome làm phương án dự phòng.

---

## 1. Hiểu hệ thống bằng một ví dụ: nhà hàng

| Ngoài đời | Trong hệ thống | Làm gì |
|---|---|---|
| Khách ăn | **App điện thoại** (thí sinh, trọng tài) | Xem câu hỏi, gửi đáp án |
| Quản lý sảnh ra lệnh | **Web admin** | Bắt đầu trận, chọn câu, bấm giờ, cứu trợ |
| Bếp trưởng | **Backend** (máy chủ) | Nhận lệnh, kiểm tra luật, lưu kết quả, báo cho mọi người |
| Sổ sách | **MySQL** (cơ sở dữ liệu) | Lưu tài khoản, trận, câu hỏi, kết quả |
| Loa phát thanh | **Socket.IO** | Máy chủ "hô lên" cho cả phòng nghe cùng lúc |

Hai cách nói chuyện giữa app và máy chủ:
- **API (HTTP)** = gọi điện hỏi/đáp từng việc: đăng nhập, gửi đáp án, lấy danh sách trận.
- **Socket (thời gian thực)** = đường dây luôn mở để máy chủ **tự đẩy** thông tin: câu hỏi mới, đồng hồ, bị loại, được cứu.

> Điều thầy cần nghe: câu hỏi và đồng hồ **do máy chủ đẩy xuống** nên mọi thí sinh nhận cùng lúc, app không phải hỏi liên tục.

---

## 2. Công nghệ dùng và để làm gì

| Công nghệ | Một dòng giải thích |
|---|---|
| **Flutter / Dart** | Cách viết app một lần chạy được trên Android, iOS, web |
| **Riverpod** | Nơi giữ "trạng thái" (đang ở câu mấy, còn mấy giây...) và báo cho màn hình vẽ lại khi nó đổi |
| **go_router** | Quản lý chuyển màn hình và chặn người chưa đăng nhập |
| **Dio** | Công cụ gọi API; tự gắn cookie, tự làm mới phiên đăng nhập khi hết hạn |
| **socket_io_client** | Kết nối thời gian thực với máy chủ |
| **flutter_secure_storage** | Cất token đăng nhập an toàn trên máy |
| Backend: **Node.js + Express + Prisma + Socket.IO** | Máy chủ API và máy chủ thời gian thực |
| **MySQL** | Cơ sở dữ liệu |
| Web admin: **React + Vite** | Giao diện cho ban tổ chức |

---

## 3. Luồng đi của một trận (đọc thật kỹ phần này)

### 3.1 Mở app và đăng nhập
1. `main.dart` khởi động, nạp địa chỉ máy chủ đã lưu (`server_settings.dart`), rồi dựng cả app.
2. `app_router.dart` + `auth_guard.dart`: chưa đăng nhập thì ép về màn đăng nhập; đã đăng nhập thì vào đúng trang (thí sinh → danh sách trận, trọng tài → danh sách cuộc thi).
3. `login_screen.dart` gọi `auth_repository.dart` → `auth_api.dart` → máy chủ `POST /auth/student-login`.
4. Máy chủ trả về **cookie** chứa token. `api_client.dart` bắt cookie đó, `token_storage.dart` cất lại. Từ đó mọi yêu cầu tự gắn token.

### 3.2 Thí sinh vào phòng thi
1. `student_dashboard_screen.dart` hiện danh sách trận (dữ liệu từ `profile-student`), giữ kết nối thời gian thực qua `student_dashboard_controller.dart`.
2. Bấm vào trận → `waiting_room_screen.dart`. Nó kích hoạt **`match_controller.dart`** (bộ não của phòng thi).
3. `match_controller` nhờ `match_socket_gateway.dart` vào "phòng" của trận trên máy chủ rồi **lắng nghe** các sự kiện.

### 3.3 Admin phát câu hỏi
1. Admin bấm số câu trên web → máy chủ phát sự kiện `match:questionShown`.
2. `match_socket_gateway.dart` nhận sự kiện, đổi thành đối tượng `QuestionShownEvent` (`match_event.dart`).
3. `match_controller.dart` hàm `_handleEvent` → `_applyQuestion` đặt câu hỏi vào trạng thái.
4. Màn hình tự vẽ lại: `match_screen.dart` hiện câu hỏi, `answer_input.dart` hiện đáp án, `countdown_ring.dart` hiện đồng hồ.
5. Admin bấm Play → máy chủ gửi `timer:update` mỗi giây → đồng hồ chạy.

### 3.4 Thí sinh trả lời
1. Chọn đáp án → `selectAnswer`; bấm Gửi → `submit` trong `match_controller.dart`.
2. `match_repository.dart` gọi `POST /results/submit-answer`.
3. Máy chủ chấm điểm (sai là bị loại). App **giấu kết quả** cho tới khi hết giờ (`timeIsUp`), rồi mới hiện đúng/sai.
4. Hết giờ mà chưa chọn: app tự gửi "[KHÔNG CHỌN ĐÁP ÁN]".

### 3.5 Chống gian lận
`waiting_room_screen.dart` theo dõi việc app ra nền → gọi `onAppLeft` trong `match_controller.dart` → cộng số lần vi phạm. Đủ 3 lần (`maxViolations`) → khóa thí sinh và gọi `POST /results/ban-contestant`.

### 3.6 Cứu trợ
Admin bấm Cứu trợ → máy chủ phát `student:rescued` → `match_controller` đổi trạng thái thành "được cứu", xóa vi phạm → `rescue_screen.dart` hiện thông báo.

### 3.7 Trọng tài
`judge_*` làm tương tự nhưng kênh socket khác (`/match-control`): xem danh sách thí sinh trong nhóm, đổi trạng thái (Xác nhận 1, 2), Chốt câu.

---

## 4. Bản đồ file (thư mục `Contests-Mobile-app/lib`)

### `core/` — dùng chung cho cả app
| File | Chức năng |
|---|---|
| `config/env.dart` | Địa chỉ máy chủ, thời gian chờ mạng |
| `config/server_settings.dart` | Lưu địa chỉ máy chủ người dùng nhập |
| `network/api_client.dart` | **Gọi API**, gắn cookie, tự làm mới token, đổi lỗi thành tiếng Việt |
| `network/api_endpoints.dart` | Danh sách đường dẫn API |
| `network/socket_service.dart` | **Kết nối thời gian thực**, tự nối lại, nối lại khi app quay về từ nền |
| `router/app_router.dart` | Danh sách màn hình và đường dẫn |
| `router/auth_guard.dart` | Chặn người chưa đăng nhập, phân quyền thí sinh/trọng tài |
| `storage/token_storage.dart` | Cất token |
| `utils/html_text.dart` | Bỏ thẻ `<p>` trong nội dung câu hỏi |
| `widgets/status_views.dart` | Màn hình đang tải / báo lỗi / trống / dải mất kết nối |

### `features/auth/` — đăng nhập, đăng ký, quên mật khẩu
`login_screen.dart`, `register_screen.dart`, `forgot_password_screen.dart` (giao diện); `auth_repository.dart` (logic đăng nhập); `auth_api.dart`, `account_api.dart` (gọi API); `auth_user.dart` (mô hình người dùng).

### `features/match/` — **phòng thi của thí sinh (quan trọng nhất)**
| File | Chức năng |
|---|---|
| `presentation/match_controller.dart` | **Bộ não**: nhận sự kiện, đồng hồ, nộp đáp án, chống gian lận |
| `data/match_socket_gateway.dart` | Nói chuyện với máy chủ qua socket |
| `data/match_repository.dart` | Gọi API nộp đáp án, báo cấm thi |
| `domain/match_models.dart` | Mô hình dữ liệu: câu hỏi, trạng thái trận |
| `domain/match_event.dart` | Các loại sự kiện nhận từ máy chủ |
| `presentation/match_screen.dart` | Màn hình làm bài |
| `presentation/waiting_room_screen.dart` | Phòng chờ, kết thúc, theo dõi rời app |
| `presentation/student_dashboard_*.dart` | Danh sách trận |

### `features/judge/` — trọng tài
`judge_match_controller.dart` (bộ não), `judge_socket_gateway.dart`, `judge_repository.dart`, `judge_models.dart`, `judge_match_control_screen.dart`, `judge_lists_screens.dart`.

### Khác
`features/rescue/` giao diện bị loại/cấm/cứu; `features/profile/` hồ sơ, giải thưởng, nhà tài trợ; `features/settings/` đổi địa chỉ máy chủ.

**Quy ước tên:** `*_screen.dart` = giao diện; `*_controller.dart` = logic của màn; `*_api / *_repository / *_gateway` = nói chuyện với máy chủ; `*_models.dart` = hình dạng dữ liệu.

---

## 5. Lỗi thường gặp → xem ở đâu, sửa gì

### Lỗi do cấu hình/dữ liệu (không cần sửa code)
| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| App báo "không thể kết nối máy chủ" | IP máy tính đã đổi | `ipconfig` lấy IP mới → app: **Đổi** → nhập `IP:3000` → Lưu → đóng hẳn app mở lại |
| Điện thoại không mở được `http://IP:3000/...` | Tường lửa hoặc khác Wi-Fi | Mở cổng 3000 trong Windows Firewall; cùng Wi-Fi |
| Thí sinh không thấy trận nào | `matches.slug` còn rỗng | Chạy `chuan_bi_du_lieu.sql` |
| Admin bấm số câu mà không đổi | Thiếu bảng `screen_controls` | Chạy `chuan_bi_du_lieu.sql` |
| Thí sinh không thấy câu hỏi | Chưa Bắt Đầu Trận, hoặc chưa bấm số câu | Bắt Đầu → bấm số 2 rồi 1 → Show → Play |
| Admin báo `not-authorized` | Admin và thí sinh chung cửa sổ trình duyệt | Mở admin bằng cửa sổ ẩn danh |
| Trọng tài đăng nhập không được | Mật khẩu chưa mã hóa | Chạy `chuan_bi_du_lieu.sql` |
| "Không tìm thấy thông tin thí sinh trong cuộc thi" | Tài khoản chưa nằm trong bảng thí sinh | Dùng `student_10104` |
| Gửi đáp án báo lỗi / không nhận | Đã nộp câu này rồi | Chạy lại phần đặt lại trận trong `chuan_bi_du_lieu.sql` |
| Web admin hiện "Đăng nhập thất bại" ngay | Thiếu file `.env` ở web admin | Sao chép `.env.example` thành `.env`, chạy lại `npm run dev` |
| Backend báo cổng 3000 đang dùng | Đã có một backend chạy sẵn | Tắt cái cũ (Ctrl+C), chạy lại |

### Muốn đổi một thứ nhỏ trong code (chỉ làm khi KHÔNG phải tối nay)
| Muốn đổi | File | Chỗ cần tìm |
|---|---|---|
| Số lần rời app trước khi bị cấm | `features/match/domain/match_models.dart` | `maxViolations` (dòng cuối file) |
| Địa chỉ mặc định khi chưa cấu hình | `core/config/env.dart` | `_defaultDevelopmentServerUrl` |
| Thời gian chờ mạng | `core/config/env.dart` | `connectTimeout`, `receiveTimeout` |
| Màu chủ đạo của app | `main.dart` | `seedColor` |
| Tên app | `android/app/src/main/AndroidManifest.xml` (`android:label`), `main.dart` (`title`) | |
| Chữ thông báo cảnh báo gian lận | `features/match/presentation/match_controller.dart` | hàm `onAppLeft` |
| Đường dẫn một API | `core/network/api_endpoints.dart` | |
| Tên một sự kiện socket | `features/match/data/match_socket_gateway.dart` | hàm `watch` |

Sau mỗi lần sửa code phải chạy `flutter analyze`, `flutter test`, rồi build lại APK.

---

## 6. Lệnh cần nhớ

| Việc | Lệnh |
|---|---|
| Bật backend | `cd D:\DATN\Contests-BE-main` → `npm run dev` |
| Bật web admin | `cd D:\DATN\Contests-FE-main` → `npm run dev` |
| Chạy app trên Chrome | `cd D:\DATN\Contests-Mobile-app` → `flutter run -d chrome --web-port=5000` |
| Kiểm tra code | `flutter analyze` và `flutter test` |
| Build APK | `flutter build apk --release --dart-define=APP_ENV=production --dart-define=SERVER_URL=http://IP:3000` |
| Xem IP máy | `ipconfig` |

---

## 7. Mười câu nên nói được bằng lời của mình

1. "Hệ thống có ba phần: app Flutter cho thí sinh và trọng tài, backend Node.js, và web admin cho ban tổ chức."
2. "Câu hỏi và đồng hồ do máy chủ đẩy xuống qua Socket.IO, nên mọi thí sinh nhận cùng lúc."
3. "Đăng nhập dùng cookie; app cất token trong kho bảo mật của máy và tự làm mới khi hết hạn."
4. "Em giấu kết quả đúng sai cho tới khi hết giờ, vì theo luật backend trả lời sai là bị loại ngay."
5. "Chống gian lận bằng cách phát hiện app ra nền; đủ 3 lần thì khóa thí sinh và báo lên máy chủ."
6. "Mất mạng thì app tự nối lại, khi quay về từ nền thì vào lại phòng và đồng bộ trạng thái."
7. "Có 52 bài test tự động và `flutter analyze` không còn cảnh báo."
8. "Địa chỉ máy chủ đổi được ngay trong app nên không cần build lại khi đổi mạng."
9. "Hạn chế: chưa build iOS, đang chạy mạng nội bộ bằng HTTP, chưa chống được chụp màn hình."
10. "Hướng phát triển: HTTPS và máy chủ cố định, thông báo đẩy, bảng xếp hạng thời gian thực."

---

## 8. Kế hoạch học 3 giờ chiều nay

| Thời gian | Việc |
|---|---|
| 30 phút | Chạy hệ thống và chạy thử kịch bản demo 2 lần |
| 30 phút | Đọc mục 3 (luồng đi), mở từng file trong mục 3 xem bằng mắt (không cần hiểu từng dòng) |
| 30 phút | Mở `match_controller.dart`, tìm hàm `_handleEvent`, `submit`, `onAppLeft` và tự giải thích bằng lời |
| 30 phút | Tập trả lời mục 7, và các câu hỏi trong tin nhắn trước |
| 30 phút | Tập xử lý sự cố (mục 5) bằng cách cố tình làm hỏng rồi sửa: đổi sai IP trong app rồi sửa lại, quên bấm Show rồi nhớ ra |
| 30 phút | Quay video dự phòng, nạp pin, kiểm tra Wi-Fi |

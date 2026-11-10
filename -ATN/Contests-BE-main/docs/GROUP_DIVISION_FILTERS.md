# Hướng dẫn sử dụng bộ lọc trong trang chia nhóm thí sinh

## Tổng quan
Trang chia nhóm thí sinh đã được bổ sung các bộ lọc mới để giúp quản lý và tìm kiếm thí sinh hiệu quả hơn.

## Các bộ lọc có sẵn

### 1. Tìm kiếm (Search)
- Tìm kiếm theo tên hoặc mã sinh viên
- Hỗ trợ tìm kiếm không phân biệt hoa thường

### 2. Vòng đấu (Round)
- Lọc thí sinh theo vòng đấu cụ thể
- Hiển thị danh sách tất cả các vòng đấu trong cuộc thi

### 3. Trạng thái (Status)
- **Thi đấu**: Thí sinh đang tham gia thi
- **Bị loại**: Thí sinh đã bị loại
- **Qua vòng**: Thí sinh đã vượt qua vòng hiện tại

### 4. Trường học (School) - MỚI
- Lọc thí sinh theo trường học
- Khi chọn trường, danh sách lớp học sẽ được cập nhật tương ứng
- Auto-reset lớp học khi thay đổi trường

### 5. Lớp học (Class) - MỚI
- Lọc thí sinh theo lớp học cụ thể
- Chỉ hiển thị các lớp thuộc trường đã chọn
- Bị vô hiệu hóa khi chưa chọn trường

### 6. Nhóm (Group) - MỚI
- **Tất cả**: Hiển thị tất cả thí sinh
- **Chưa phân nhóm**: Chỉ hiển thị thí sinh chưa được phân vào nhóm nào
- **Nhóm cụ thể**: Hiển thị thí sinh thuộc nhóm đã chọn

## Cách sử dụng

### Lọc cơ bản
1. Chọn các tiêu chí lọc từ dropdown menu
2. Hệ thống sẽ tự động cập nhật danh sách thí sinh
3. Số lượng thí sinh được lọc hiển thị ở cuối trang

### Lọc kết hợp
- Có thể sử dụng nhiều bộ lọc cùng lúc
- Các filter hoạt động theo logic AND (tất cả điều kiện phải thỏa mãn)

### Xóa bộ lọc
- Click vào icon X trên chip filter để xóa từng bộ lọc
- Sử dụng nút "Xóa tất cả bộ lọc" để reset toàn bộ

### Thống kê hiển thị
- Phần đầu danh sách hiển thị các chip của filter đang áp dụng
- Phần cuối hiển thị: "Hiển thị: X / Tổng số: Y thí sinh"

## Lưu ý kỹ thuật

### Frontend Filtering
- Các filter Trường học, Lớp học, và Nhóm được xử lý ở frontend
- Giúp giảm tải server và cải thiện trải nghiệm người dùng
- Dữ liệu được lọc từ dataset đã tải về

### Backend Filtering  
- Các filter cơ bản (Tìm kiếm, Vòng đấu, Trạng thái) được xử lý ở backend
- Hỗ trợ phân trang và tối ưu hiệu suất

### API Endpoints sử dụng
- `GET /group-division/schools` - Lấy danh sách trường học
- `GET /group-division/schools/:schoolId/classes` - Lấy danh sách lớp theo trường
- `GET /group-division/matches/:matchId/groups` - Lấy danh sách nhóm hiện tại

## Các trường hợp sử dụng phổ biến

1. **Tìm thí sinh từ trường cụ thể**: Chọn filter Trường học
2. **Xem thí sinh chưa phân nhóm**: Chọn "Chưa phân nhóm" trong filter Nhóm
3. **Kiểm tra thí sinh trong nhóm**: Chọn nhóm cụ thể trong filter Nhóm
4. **Lọc theo lớp**: Chọn trường trước, sau đó chọn lớp
5. **Kết hợp nhiều điều kiện**: Ví dụ chọn trường A, lớp B, và trạng thái "Thi đấu"

## Cải tiến trong tương lai
- [ ] Lưu trạng thái filter giữa các session
- [ ] Export danh sách thí sinh đã lọc
- [ ] Filter theo khu vực địa lý
- [ ] Quick filter buttons cho các trường hợp phổ biến

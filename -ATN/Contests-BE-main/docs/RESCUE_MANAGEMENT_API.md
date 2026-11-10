# API Rescue Management - Thêm/Xóa StudentIds

Tài liệu này mô tả 2 API mới được bổ sung để quản lý studentIds trong bảng rescue:

## 1. API Thêm hàng loạt studentIds vào rescue

### Endpoint
```
POST /contestant/rescue/add-students
```

### Request Body
```json
{
  "rescueId": 1,
  "studentIds": [101, 102, 103, 104]
}
```

### Response Success
```json
{
  "success": true,
  "message": "Đã thêm 4 sinh viên vào rescue. Tổng cộng: 7 sinh viên",
  "rescue": {
    "id": 1,
    "matchId": 1,
    "studentIds": [101, 102, 103, 104, 105, 106, 107],
    "questionOrder": 5,
    "status": "pending",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T01:00:00.000Z"
  },
  "addedCount": 4,
  "totalCount": 7
}
```

### Đặc điểm
- **Không trùng lặp**: Chỉ thêm những studentId chưa có trong rescue
- **Push nhiều**: Có thể thêm nhiều studentId cùng lúc
- **Validation**: Kiểm tra rescueId và danh sách studentIds hợp lệ

---

## 2. API Xóa 1 studentId khỏi rescue

### Endpoint
```
DELETE /contestant/rescue/remove-student
```

### Request Body
```json
{
  "rescueId": 1,
  "studentId": 102
}
```

### Response Success
```json
{
  "success": true,
  "message": "Đã xóa sinh viên 102 khỏi rescue. Còn lại: 6 sinh viên",
  "rescue": {
    "id": 1,
    "matchId": 1,
    "studentIds": [101, 103, 104, 105, 106, 107],
    "questionOrder": 5,
    "status": "pending",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T01:00:00.000Z"
  },
  "removedStudentId": 102,
  "totalCount": 6
}
```

### Đặc điểm
- **Xóa chính xác**: Chỉ xóa 1 studentId được chỉ định
- **Kiểm tra tồn tại**: Báo lỗi nếu studentId không có trong rescue
- **Validation**: Kiểm tra rescueId và studentId hợp lệ

---

## 3. Error Handling

### Lỗi thường gặp:

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Thiếu hoặc sai rescueId"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Rescue không tồn tại"
}
```

#### 400 Student Not Found (chỉ cho remove)
```json
{
  "success": false,
  "message": "Student ID không tồn tại trong rescue này"
}
```

---

## 4. Schema Validation

### AddStudentsToRescueSchema
```typescript
{
  rescueId: number (positive integer),
  studentIds: number[] (array of positive integers, min 1 item)
}
```

### RemoveStudentFromRescueSchema
```typescript
{
  rescueId: number (positive integer),
  studentId: number (positive integer)
}
```

---

## 5. Frontend Integration

### React Hooks
```typescript
// Hook thêm studentIds
const addMutation = useAddStudentsToRescue();

// Sử dụng
addMutation.mutate({
  rescueId: 1,
  studentIds: [101, 102, 103]
});

// Hook xóa studentId
const removeMutation = useRemoveStudentFromRescue();

// Sử dụng
removeMutation.mutate({
  rescueId: 1,
  studentId: 102
});
```

### API Functions
```typescript
// Thêm studentIds
const result = await addStudentsToRescue(1, [101, 102, 103]);

// Xóa studentId
const result = await removeStudentFromRescue(1, 102);
```

---

## 6. Use Cases

### Thêm studentIds
- Quản trị viên muốn bổ sung thêm thí sinh vào danh sách cứu trợ
- Import danh sách thí sinh từ file Excel/CSV
- Thêm thí sinh được đề xuất từ các tiêu chí khác

### Xóa studentId
- Loại bỏ thí sinh không đủ điều kiện cứu trợ
- Sửa lỗi khi thêm nhầm thí sinh
- Quản lý danh sách cứu trợ linh hoạt

---

## 7. Testing

Sử dụng script PowerShell để test:
```bash
# Chạy script test
.\scripts\test-rescue-management.ps1
```

Script sẽ test các trường hợp:
1. Thêm studentIds mới
2. Thêm studentIds trùng lặp (test duplicate check)
3. Xóa studentId tồn tại
4. Xóa studentId không tồn tại (test error handling)
5. Verify kết quả

---

## 8. Database Schema

Bảng `rescue` sử dụng cột `studentIds` kiểu JSON để lưu trữ:
```sql
studentIds JSON -- Mảng các studentId: [101, 102, 103]
```

Cả 2 API đều:
- Parse JSON hiện tại thành mảng number[]
- Thực hiện thao tác (thêm/xóa)
- Lưu lại mảng đã cập nhật vào DB

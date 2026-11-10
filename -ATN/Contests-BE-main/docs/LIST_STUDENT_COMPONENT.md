# ListStudent Component

## Mô tả
Component `ListStudent` được sử dụng trong dialog "Thêm thí sinh" để hiển thị danh sách học sinh có thể thêm vào cuộc thi.

## Tính năng
- Hiển thị danh sách học sinh với thông tin chi tiết (mã SV, tên, lớp, trường, email)
- Tìm kiếm theo tên hoặc mã sinh viên
- Lọc theo trường học và lớp học
- Chọn nhiều học sinh bằng checkbox
- Phân trang
- Loading state và error handling

## Props
```typescript
interface ListStudentProps {
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
}
```

## Sử dụng
```tsx
<ListStudent
  selectedIds={selectedIds}
  setSelectedIds={setSelectedIds}
/>
```

## TODO
- [ ] Tích hợp với API thực tế
- [ ] Thêm validation cho dữ liệu
- [ ] Thêm export/import functionality
- [ ] Tối ưu hóa performance với virtualization cho danh sách lớn
- [ ] Thêm bulk actions

## API Integration
Hiện tại component sử dụng mock data. Để tích hợp với API thực:

1. Thay thế `mockStudents` bằng API call
2. Cập nhật `fetchStudents` function
3. Thêm error handling cho network errors
4. Implement proper pagination từ backend

```typescript
// Ví dụ API integration
const fetchStudents = async () => {
  const response = await studentApi.getStudents({
    search,
    schoolId: schoolFilter,
    classId: classFilter,
    page,
    limit,
  });
  
  setStudents(response.data.students);
  setTotalPages(response.data.pagination.totalPages);
};
```

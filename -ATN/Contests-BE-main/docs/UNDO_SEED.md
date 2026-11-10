# Undo Seed Scripts Documentation

## Tổng quan

Project này bao gồm 2 script để undo (xóa) dữ liệu seed:

1. **undo-seed.ts** - Script đơn giản với confirmation
2. **undo-seed-advanced.ts** - Script nâng cao với nhiều tùy chọn

## 🗂️ Cấu trúc Database

Dữ liệu được xóa theo thứ tự ngược lại với dependencies để tránh lỗi foreign key:

```
Level 1 (Xóa trước): Screen_Controls, Class_Videos, Awards, Rescues, Results
Level 2: Contestant_Matches, Groups
Level 3: Contestants, Matches  
Level 4: Rounds, Contests
Level 5: Question_Details, Questions, Question_Packages, Question_Topics
Level 6: Students, Classes, Schools
Level 7 (Xóa cuối): Sponsors, About, Users
```

## 🔧 Cách sử dụng

### Script đơn giản (undo-seed.ts)

```bash
# Xóa tất cả dữ liệu với confirmation
npm run prisma:undo-seed

# Xóa tất cả dữ liệu không confirmation  
npm run prisma:undo-seed-force
```

### Script nâng cao (undo-seed-advanced.ts)

```bash
# Xóa tất cả dữ liệu với confirmation
npm run prisma:undo-seed-advanced

# Xóa tất cả dữ liệu không confirmation
npm run prisma:undo-seed-advanced -- --force

# Xóa các bảng cụ thể (không cần confirmation)
npm run prisma:undo-seed-advanced -- --tables users,schools,classes

# Hiển thị help
npm run prisma:undo-seed-advanced -- --help
```

### Sử dụng trực tiếp với ts-node

```bash
# Script đơn giản
ts-node prisma/undo-seed.ts
ts-node prisma/undo-seed.ts --force

# Script nâng cao  
ts-node prisma/undo-seed-advanced.ts
ts-node prisma/undo-seed-advanced.ts --force
ts-node prisma/undo-seed-advanced.ts --tables users,schools
ts-node prisma/undo-seed-advanced.ts --help
```

## 📋 Danh sách các bảng

| Key | Table Name | Mô tả |
|-----|------------|-------|
| `users` | Users | Người dùng hệ thống |
| `schools` | Schools | Danh sách trường học |
| `classes` | Classes | Lớp học |
| `students` | Students | Học sinh |
| `about` | About | Thông tin giới thiệu |
| `questionTopics` | Question_Topics | Chủ đề câu hỏi |
| `questionPackages` | Question_Packages | Gói câu hỏi |
| `questions` | Questions | Câu hỏi |
| `questionDetails` | Question_Details | Chi tiết câu hỏi |
| `contests` | Contests | Cuộc thi |
| `rounds` | Rounds | Vòng thi |
| `matches` | Matches | Trận đấu |
| `groups` | Groups | Nhóm |
| `contestants` | Contestants | Thí sinh |
| `contestantMatches` | Contestant_Matches | Thí sinh tham gia trận đấu |
| `results` | Results | Kết quả |
| `rescues` | Rescues | Cứu hộ |
| `awards` | Awards | Giải thưởng |
| `sponsors` | Sponsors | Nhà tài trợ |
| `classVideos` | Class_Videos | Video lớp học |
| `screenControls` | Screen_Controls | Điều khiển màn hình |

## ⚠️ Lưu ý quan trọng

1. **Backup dữ liệu**: Luôn backup dữ liệu trước khi chạy undo seed
2. **Environment**: Kiểm tra `DATABASE_URL` trong `.env`
3. **Dependencies**: Script tự động xử lý foreign key dependencies
4. **Auto-increment**: Script sẽ reset auto-increment về 1 sau khi xóa
5. **Irreversible**: Thao tác xóa là vĩnh viễn, không thể hoàn tác

## 🔄 Reset Auto-increment

Sau khi xóa dữ liệu, script sẽ tự động reset auto-increment counter về 1 cho tất cả các bảng:

```sql
ALTER TABLE TableName AUTO_INCREMENT = 1
```

## 🎯 Ví dụ sử dụng thực tế

### Xóa toàn bộ dữ liệu để test lại từ đầu
```bash
npm run prisma:undo-seed-force && npm run prisma:seed
```

### Xóa chỉ dữ liệu users và schools
```bash
npm run prisma:undo-seed-advanced -- --tables users,schools
```

### Xóa dữ liệu contests và related data
```bash
npm run prisma:undo-seed-advanced -- --tables screenControls,awards,rescues,results,contestantMatches,groups,contestants,matches,rounds,contests
```

## 🚨 Troubleshooting

### Lỗi foreign key constraint
```
Error: Foreign key constraint fails
```
**Giải pháp**: Script đã được thiết kế để xóa theo đúng thứ tự dependencies. Nếu vẫn gặp lỗi, hãy kiểm tra lại cấu trúc database.

### Lỗi DATABASE_URL
```
Error: DATABASE_URL không được định nghĩa trong .env
```
**Giải pháp**: Kiểm tra file `.env` và đảm bảo `DATABASE_URL` được cấu hình đúng.

### Lỗi quyền truy cập
```
Error: Access denied for user
```
**Giải pháp**: Kiểm tra quyền user database có thể DELETE và ALTER TABLE.

## 📝 Log Output

Script sẽ hiển thị log chi tiết:

```
🚀 Bắt đầu undo seeding dữ liệu...
🗑️  Đang xóa 5 records từ bảng Screen_Controls...
✅ Đã xóa 5 records từ bảng Screen_Controls
🗑️  Đang xóa 10 records từ bảng Awards...
✅ Đã xóa 10 records từ bảng Awards
...
🔄 Đang reset auto-increment counters...
✅ Reset auto-increment cho bảng Users
...
🎉 Undo seeding hoàn tất!
```

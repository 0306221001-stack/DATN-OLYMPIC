# Hướng dẫn xử lý câu trả lời tự luận

## Mục lục
1. [Tổng quan](#1-tổng-quan)
2. [Quy trình xử lý](#2-quy-trình-xử-lý)
3. [Xử lý ngôn ngữ](#3-xử-lý-ngôn-ngữ)
4. [Quy tắc chấm điểm](#4-quy-tắc-chấm-điểm)
5. [Thông báo & Phản hồi](#5-thông-báo--phản-hồi)
6. [Ví dụ thực tế](#6-ví-dụ-thực-tế)
7. [Xử lý lỗi](#7-xử-lý-lỗi)

## 1. Tổng quan

### 1.1. Mục đích
- Cho phép học sinh trả lời câu hỏi dạng văn bản tự do
- Đảm bảo tính chính xác trong việc chấm điểm
- Hỗ trợ đa ngôn ngữ (Tiếng Việt, Tiếng Anh)

### 1.2. Đặc điểm
- Phân biệt với câu hỏi trắc nghiệm
- Xử lý thông minh dấu câu và ký tự đặc biệt
- Bảo toàn ngữ nghĩa của câu trả lời

## 2. Quy trình xử lý

### 2.1. Kiểm tra format
```typescript
// Các pattern không hợp lệ
const optionPatterns = [
  /^option\s*[a-d]$/i,  // "Option A", "option a"
  /^[a-d]$/i,          // "A", "a", "B", "b"
  /^[a-d]\./i          // "A.", "a."
];

// Kiểm tra format không hợp lệ
const isOptionFormat = optionPatterns.some(pattern => 
  pattern.test(studentAnswer)
);
```

### 2.2. Chuẩn hóa đáp án
```typescript
const normalizeAnswer = (text: string): string => {
  // Bước 1: Lowercase và trim
  let normalized = text.toLowerCase().trim();
  
  // Bước 2: Xóa ký tự đặc biệt ở đầu câu
  normalized = normalized.replace(/^[@#$%^&*+=|\\<>/`~]+/, "");
  
  // Bước 3: Tách dấu chấm cuối câu
  let hasDot = false;
  if (normalized.endsWith('.')) {
    hasDot = true;
    normalized = normalized.slice(0, -1).trim();
  }
  
  // Bước 4: Xóa ký tự đặc biệt (giữ nguyên dấu câu)
  normalized = normalized.replace(/[@#$%^&*+=|\\<>/`~]/g, ' ');
  
  // Bước 5: Chuẩn hóa khoảng trắng
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Bước 6: Thêm lại dấu chấm nếu có
  if (hasDot) {
    normalized = normalized + '.';
  }
  
  return normalized;
}
```

### 2.3. So sánh đáp án
```typescript
// So sánh bỏ qua dấu chấm cuối câu
const compareWithoutEndDot = (a: string, b: string): boolean => {
  const stripDot = (s: string) => s.endsWith('.') ? s.slice(0, -1) : s;
  return stripDot(a) === stripDot(b);
};

// So sánh từng từ
const compareWords = (studentWords: string[], correctWords: string[]): boolean => {
  if (studentWords.length !== correctWords.length) return false;
  
  return studentWords.every((word, index) => {
    if (index === studentWords.length - 1) {
      return compareWithoutEndDot(word, correctWords[index]);
    }
    return word === correctWords[index];
  });
};
```

## 3. Xử lý ngôn ngữ

### 3.1. Tiếng Việt
| Quy tắc | Mô tả | Ví dụ |
|---------|--------|-------|
| Dấu thanh | Bắt buộc đúng | "hòa" ≠ "hoa" |
| Dấu mũ | Bắt buộc đúng | "ô tô" ≠ "o to" |
| Dấu móc | Bắt buộc đúng | "mở" ≠ "mo" |
| Dấu đ | Bắt buộc đúng | "đúng" ≠ "dung" |
| Dấu chấm cuối | Tùy chọn | "Tôi đi học." = "Tôi đi học" |

### 3.2. Tiếng Anh
| Quy tắc | Mô tả | Ví dụ |
|---------|--------|-------|
| Hoa/thường | Không phân biệt | "Hello" = "hello" |
| Dấu chấm cuối | Tùy chọn | "I am studying." = "I am studying" |
| Dấu câu giữa | Bắt buộc đúng | "Yes, I am" ≠ "Yes I am" |

## 4. Quy tắc chấm điểm

### 4.1. Điều kiện đúng
- ✅ Nội dung giống hệt (bỏ qua hoa/thường)
- ✅ Dấu câu giữa câu giống hệt
- ✅ Dấu chấm cuối câu tùy chọn
- ✅ Tiếng Việt: đúng tất cả dấu

### 4.2. Điều kiện sai
- ❌ Thiếu hoặc thừa từ
- ❌ Sai dấu câu giữa câu
- ❌ Tiếng Việt: sai dấu thanh
- ❌ Dùng format option (A, B, C, D)
- ❌ Có ký tự đặc biệt (@, #, $, etc.)

### 4.3. Xử lý đặc biệt
```typescript
// Trường hợp đặc biệt cho câu ngắn
if (normalizedAnswer.split(/\s+/).length <= 2) {
  // Yêu cầu khớp chính xác 100%
  return normalizedStudentAnswer === normalizedCorrectAnswer;
}
```

## 5. Thông báo & Phản hồi

### 5.1. Thông báo lỗi format
```typescript
if (isOptionFormat) {
  return {
    success: false,
    message: "⚠️ Phát hiện lỗi: Bạn đã gửi format lựa chọn cho câu hỏi tự luận",
    eliminationReason: "essay_option_format_error"
  };
}
```

### 5.2. Thông báo kết quả
```typescript
const response = {
  success: true,
  message: isCorrect 
    ? "Câu trả lời chính xác! 🎉"
    : "Câu trả lời tự luận không chính xác. Hãy kiểm tra lại nội dung!",
  result: {
    isCorrect,
    questionOrder: data.questionOrder,
    submittedAt: new Date().toISOString(),
    eliminated: !isCorrect,
    score: isCorrect ? question.score : 0,
    correctAnswer: !isCorrect ? question.correctAnswer : undefined,
    explanation: !isCorrect ? question.explanation : undefined
  }
};
```

## 6. Ví dụ thực tế

### 6.1. Tiếng Việt
```typescript
// Đúng
"Hà Nội là thủ đô của Việt Nam." === "Hà Nội là thủ đô của Việt Nam"
"hà nội là thủ đô của việt nam." === "Hà Nội là thủ đô của Việt Nam."

// Sai
"Ha Noi la thu do cua Viet Nam" !== "Hà Nội là thủ đô của Việt Nam"
"Hà Nội là thủ đô của VN." !== "Hà Nội là thủ đô của Việt Nam"
```

### 6.2. Tiếng Anh
```typescript
// Đúng
"London is the capital of England." === "London is the capital of England"
"london is the capital of england." === "London is the capital of England."

// Sai
"London is capital of England" !== "London is the capital of England"
"London, is the capital of England" !== "London is the capital of England"
```

## 7. Xử lý lỗi

### 7.1. Loại lỗi và xử lý
| Loại lỗi | Xử lý | Thông báo |
|----------|--------|-----------|
| Format option | Đánh sai | "Vui lòng trả lời bằng văn bản" |
| Ký tự đặc biệt | Loại bỏ | "Câu trả lời có ký tự không hợp lệ" |
| Dấu câu sai | Đánh sai | "Kiểm tra lại dấu câu" |
| Thiếu dấu | Đánh sai | "Kiểm tra lại dấu từ" |

### 7.2. Log lỗi
```typescript
console.warn(`⚠️ [API SUBMIT] Lỗi format: "${data.answer}" - ContestantId: ${contestantId}`);
logger.error("Error in essay answer validation:", error);
```

---

## Cập nhật & Bảo trì

### Thêm ngôn ngữ mới
1. Thêm rules xử lý dấu đặc thù
2. Cập nhật hàm normalizeAnswer
3. Thêm test cases

### Điều chỉnh độ chính xác
1. Sửa đổi ngưỡng so sánh
2. Thêm/bớt quy tắc chuẩn hóa
3. Cập nhật điều kiện đúng/sai 
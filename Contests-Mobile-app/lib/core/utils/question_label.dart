/// Số câu chính của một trận (4 Alpha, 4 Beta, 4 RC, 1 Gold). Câu có thứ tự
/// lớn hơn trong gói câu hỏi là câu dự phòng.
const int mainQuestionCount = 13;

/// `true` nếu câu thứ [order] là câu dự phòng.
bool isBackupQuestion(int order) => order > mainQuestionCount;

/// Nhãn hiển thị: "Câu 5" hoặc "Câu dự phòng 1" (với câu 14).
String questionLabel(int order) {
  if (isBackupQuestion(order)) {
    return 'Câu dự phòng ${order - mainQuestionCount}';
  }
  return 'Câu $order';
}

// Quy ước câu hỏi dự phòng: một trận có MAIN_QUESTION_COUNT câu chính
// (4 Alpha, 4 Beta, 4 RC, 1 Gold). Các câu có thứ tự lớn hơn trong gói câu hỏi
// là câu dự phòng, dùng khi cần thêm câu (thay câu lỗi, phân định thí sinh...).

export const MAIN_QUESTION_COUNT = 13;

/** Câu có thứ tự [order] là câu dự phòng hay không. */
export const isBackupQuestion = (order: number | null | undefined): boolean =>
  typeof order === "number" && order > MAIN_QUESTION_COUNT;

/** Số thứ tự trong nhóm dự phòng (câu 14 -> 1, câu 15 -> 2...). */
export const backupIndex = (order: number): number =>
  order - MAIN_QUESTION_COUNT;

/** Số câu chính thực có trong danh sách (gói có thể ít hơn 13 câu). */
export const countMainQuestions = (orders: number[]): number =>
  orders.filter(order => !isBackupQuestion(order)).length;

/** Nhãn ngắn hiển thị cho một câu: "Câu 5" hoặc "Dự phòng 1". */
export const questionLabel = (order: number | null | undefined): string => {
  if (typeof order !== "number") return "Câu -";
  return isBackupQuestion(order)
    ? `Dự phòng ${backupIndex(order)}`
    : `Câu ${order}`;
};

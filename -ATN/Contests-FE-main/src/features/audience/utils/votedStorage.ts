// Ghi nhận khán giả đã bình chọn cho từng đợt cứu trợ trên thiết bị này,
// để mỗi điện thoại chỉ gửi một phiếu cho mỗi lượt trợ giúp.
const keyOf = (rescueId: number) => `audience-voted-${rescueId}`;

export const hasVoted = (rescueId: number): boolean => {
  try {
    return localStorage.getItem(keyOf(rescueId)) === "1";
  } catch {
    return false;
  }
};

export const markVoted = (rescueId: number): void => {
  try {
    localStorage.setItem(keyOf(rescueId), "1");
  } catch {
    // Trình duyệt chặn lưu trữ: bỏ qua, máy chủ vẫn nhận phiếu bình thường
  }
};

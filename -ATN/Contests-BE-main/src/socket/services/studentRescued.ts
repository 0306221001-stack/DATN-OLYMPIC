import { Server } from "socket.io";

interface RescuedContestant {
  contestantId: number;
  registrationNumber: number;
}

/**
 * Báo cho thí sinh đang ở phòng thi biết ai vừa được cứu trợ, để màn hình câu
 * hỏi cập nhật ngay mà không phải thoát ra vào lại.
 *
 * Gửi riêng id thí sinh và số báo danh vì hai loại số này cùng khoảng giá trị,
 * trộn chung thì thí sinh khác có thể nhận nhầm. `rescuedContestantIds` giữ
 * tên cũ (thực chất là số báo danh) cho web thí sinh.
 */
export const notifyStudentsRescued = (
  io: Server,
  match: { id: number; slug: string | null },
  rescued: RescuedContestant[]
): void => {
  if (rescued.length === 0) return;

  // Thí sinh ở cả room theo id lẫn theo slug: phát một lần cho cả hai để
  // Socket.IO loại trùng.
  const rooms = [`match-${match.id}`];
  if (match.slug) rooms.push(`match-${match.slug}`);

  const registrationNumbers = rescued.map(r => r.registrationNumber);
  io.of("/student")
    .to(rooms)
    .emit("student:rescued", {
      matchId: match.id,
      matchSlug: match.slug,
      contestantIds: rescued.map(r => r.contestantId),
      registrationNumbers,
      rescuedContestantIds: registrationNumbers,
      message: "Bạn đã được cứu trợ! Hãy tiếp tục thi đấu.",
    });
};

// src/socket/services/contestantSync.ts
// Đồng bộ real-time danh sách thí sinh cho các trang quản trị đang mở.
import { prisma } from "@/config/database";
import { logger } from "@/utils/logger";
import { socketService } from "../SocketService";

export const CONTESTANTS_CHANGED_EVENT = "contestants:changed";

export const contestantsRoom = (contestId: number) =>
  `contest-${contestId}-contestants`;

/** Báo cho các Admin đang xem danh sách thí sinh của cuộc thi biết dữ liệu đã đổi. */
export const emitContestantsChanged = (contestId: number | null | undefined) => {
  if (!contestId) return;
  try {
    socketService
      .getIO()
      .of("/match-control")
      .to(contestantsRoom(contestId))
      .emit(CONTESTANTS_CHANGED_EVENT, { contestId });
  } catch (err) {
    // Socket lỗi/chưa khởi tạo không được làm hỏng API chính.
    logger.warn(`[contestantSync] Không phát được sự kiện: ${(err as Error).message}`);
  }
};

/** Dùng khi chỉ biết matchId (chia nhóm, gán thí sinh vào nhóm...). */
export const emitContestantsChangedByMatch = async (matchId: number) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { contestId: true },
    });
    emitContestantsChanged(match?.contestId);
  } catch (err) {
    logger.warn(`[contestantSync] ${(err as Error).message}`);
  }
};

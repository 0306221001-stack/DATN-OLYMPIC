import { socketService } from "@/socket/SocketService";
import { prisma } from "@/config/database";
import { logger } from "@/utils/logger";

/**
 * Báo cho trang admin, trọng tài và màn chiếu danh sách thí sinh mới nhất của
 * trận, dùng khi trạng thái đổi ngoài luồng socket (thí sinh trả lời sai bị
 * loại, bị cấm vì rời ứng dụng). Lỗi phát sự kiện không được làm hỏng luồng gọi.
 */
export const broadcastContestantStatus = async (
  matchId: number
): Promise<void> => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { slug: true },
    });
    if (!match?.slug) return;
    // Nạp trễ để tránh vòng import giữa các service.
    const { default: MatchService } = await import(
      "@/modules/match/match.service"
    );
    const ListContestant = await MatchService.ListContestant(matchId);
    socketService
      .getIO()
      .of("/match-control")
      .to(`match-${match.slug}`)
      .emit("contestant:status-update", { ListContestant });
  } catch (error) {
    logger.error(
      `Không phát được trạng thái thí sinh của trận ${matchId}: ${
        (error as Error).message
      }`
    );
  }
};

import { prisma } from "@/config/database";

/**
 * Một học sinh có thể là thí sinh của nhiều cuộc thi (miễn không trùng thời
 * gian, xem API thêm thí sinh). Chọn bản ghi thí sinh của cuộc thi hiện tại:
 * 1. cuộc thi đang trong khoảng thời gian diễn ra;
 * 2. cuộc thi có trận đang diễn ra mà học sinh được xếp vào;
 * 3. bản ghi mới nhất.
 */
export const findCurrentContestantId = async (
  userId: number
): Promise<number | null> => {
  const candidates = await prisma.contestant.findMany({
    where: { student: { userId } },
    select: {
      id: true,
      contest: { select: { startTime: true, endTime: true } },
      contestantMatches: {
        where: { match: { status: "ongoing" } },
        select: { matchId: true },
        take: 1,
      },
    },
    orderBy: { id: "desc" },
  });
  if (candidates.length === 0) return null;

  const now = new Date();
  const inWindow = candidates.find(
    c => c.contest.startTime <= now && now <= c.contest.endTime
  );
  if (inWindow) return inWindow.id;

  const playing = candidates.find(c => c.contestantMatches.length > 0);
  if (playing) return playing.id;

  return candidates[0].id;
};

import { prisma } from "@/config/database";

export interface AdvanceGuard {
  /** true: phải cứu trợ trước, chưa được chuyển thí sinh sang "Qua vòng". */
  blocked: boolean;
  message: string | null;
  questionOrder: number | null;
  eliminatedRegistrationNumbers: number[];
  pendingRescues: string[];
}

const open = (questionOrder: number | null): AdvanceGuard => ({
  blocked: false,
  message: null,
  questionOrder,
  eliminatedRegistrationNumbers: [],
  pendingRescues: [],
});

/**
 * Quy tắc "cứu trợ trước, qua vòng sau": ở câu hiện tại, nếu có thí sinh vừa
 * bị loại, còn đợt cứu trợ hồi sinh đủ điều kiện dùng và chưa ai được cứu ở
 * câu này, thì chưa được chuyển thí sinh sang "Qua vòng".
 *
 * Không còn đợt cứu trợ nào dùng được thì không chặn, để trận không bị kẹt.
 */
export const getAdvanceGuard = async (
  matchId: number
): Promise<AdvanceGuard> => {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { currentQuestion: true },
  });
  if (!match) return open(null);
  const questionOrder = match.currentQuestion;

  const eliminatedNow = await prisma.contestantMatch.findMany({
    where: {
      matchId,
      status: "eliminated",
      eliminatedAtQuestionOrder: questionOrder,
    },
    select: { registrationNumber: true },
    orderBy: { registrationNumber: "asc" },
  });
  if (eliminatedNow.length === 0) return open(questionOrder);

  // Đã có thí sinh được cứu ở câu này: coi như đã thực hiện cứu trợ.
  const rescuedNow = await prisma.contestantMatch.count({
    where: { matchId, rescuedAtQuestionOrder: questionOrder },
  });
  if (rescuedNow > 0) return open(questionOrder);

  // Cùng điều kiện với màn điều khiển cứu trợ: trong khoảng câu, chưa dùng,
  // và số thí sinh còn thi không vượt ngưỡng của đợt cứu trợ.
  const remaining = await prisma.contestantMatch.count({
    where: { matchId, status: { in: ["in_progress", "rescued"] } },
  });
  const pending = await prisma.rescue.findMany({
    where: {
      matchId,
      rescueType: "resurrected",
      status: { not: "used" },
      questionFrom: { lte: questionOrder },
      questionTo: { gte: questionOrder },
      remainingContestants: { gte: remaining },
    },
    select: { name: true },
    orderBy: { id: "asc" },
  });
  if (pending.length === 0) return open(questionOrder);

  const numbers = eliminatedNow.map(c => c.registrationNumber);
  return {
    blocked: true,
    message: `Câu ${questionOrder} có thí sinh vừa bị loại (SBD ${numbers.join(
      ", "
    )}). Hãy cứu trợ trước rồi mới thao tác qua vòng.`,
    questionOrder,
    eliminatedRegistrationNumbers: numbers,
    pendingRescues: pending.map(r => r.name),
  };
};

/** Thí sinh còn trong trận: được phép chuyển sang "Qua vòng". */
export const ADVANCEABLE_STATUSES = [
  "in_progress",
  "rescued",
  "confirmed1",
  "confirmed2",
] as const;

/**
 * Thí sinh bị loại hoặc bị cấm không được qua vòng. Trả về câu báo lỗi nếu
 * trong danh sách có thí sinh như vậy, ngược lại trả null.
 */
export const getIneligibleAdvanceMessage = async (
  matchId: number,
  by: { contestantIds?: number[]; registrationNumbers?: number[] }
): Promise<string | null> => {
  const rows = await prisma.contestantMatch.findMany({
    where: {
      matchId,
      status: { in: ["eliminated", "banned"] },
      ...(by.contestantIds ? { contestantId: { in: by.contestantIds } } : {}),
      ...(by.registrationNumbers
        ? { registrationNumber: { in: by.registrationNumbers } }
        : {}),
    },
    select: { registrationNumber: true, status: true },
    orderBy: { registrationNumber: "asc" },
  });
  if (rows.length === 0) return null;
  const list = rows
    .map(
      r =>
        `SBD ${r.registrationNumber} (${
          r.status === "banned" ? "bị cấm" : "bị loại"
        })`
    )
    .join(", ");
  return `Không thể qua vòng: ${list}. Chỉ thí sinh chưa bị loại hoặc bị cấm mới được qua vòng.`;
};

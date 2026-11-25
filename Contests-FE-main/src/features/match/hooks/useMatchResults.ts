import { useMemo } from "react";
import type {
  ContestantMatchStatus,
  ListContestant,
} from "../types/control.type";

/** Trạng thái hiển thị của một thí sinh trên màn hình chiếu. */
export type DisplayState = "active" | "rescued" | "eliminated" | "banned";

export interface ResultContestant {
  registrationNumber: number;
  fullName: string;
  groupId: number;
  status: ContestantMatchStatus;
  eliminatedAt: number | null;
  rescuedAt: number | null;
  display: DisplayState;
}

export interface QuestionBreakdown {
  questionOrder: number;
  eliminated: number;
  rescued: number;
}

export interface MatchResults {
  contestants: ResultContestant[];
  /** Thí sinh còn trên sàn thi (đang thi, chờ xác nhận, được cứu, qua vòng). */
  remaining: ResultContestant[];
  /** Bị loại / bị cấm ở câu hiện tại (chỉ có sau khi công bố kết quả). */
  eliminatedAtCurrent: ResultContestant[];
  /** Được cứu trợ ở câu hiện tại. */
  rescuedAtCurrent: ResultContestant[];
  /** Bị loại ở các câu trước và chưa được cứu. */
  eliminatedBefore: ResultContestant[];
  /** Tổng thí sinh đang bị loại (gồm bị cấm), không tính người đã được cứu. */
  totalOut: number;
  totalRescued: number;
  totalBanned: number;
  /** Số thí sinh vượt qua / không vượt qua câu hiện tại. */
  passedCurrent: number;
  failedCurrent: number;
  /** Số bị loại và được cứu ở từng câu, từ câu 1 đến câu xa nhất đã diễn ra. */
  perQuestion: QuestionBreakdown[];
}

const OUT_STATUSES: ContestantMatchStatus[] = ["eliminated", "banned"];

/**
 * Tính kết quả trận từ danh sách thí sinh.
 *
 * Thí sinh nộp sai được Backend đánh dấu "eliminated" ngay khi nộp, nên khi
 * [revealed] = false (admin chưa bấm "Hiển thị thí sinh bị loại") những người bị
 * loại ở câu hiện tại vẫn được coi là còn thi để màn hình chiếu không lộ kết quả.
 */
export function useMatchResults(
  listContestant: ListContestant[],
  currentQuestionOrder: number,
  revealed: boolean
): MatchResults {
  return useMemo(() => {
    const contestants: ResultContestant[] = listContestant
      .flatMap(group =>
        (group.contestantMatches ?? []).map(c => {
          const eliminatedAt = c.eliminatedAtQuestionOrder ?? null;
          const isOut = OUT_STATUSES.includes(c.status);
          const hiddenUntilReveal =
            isOut && !revealed && eliminatedAt === currentQuestionOrder;

          let display: DisplayState = "active";
          if (isOut && !hiddenUntilReveal) {
            display = c.status === "banned" ? "banned" : "eliminated";
          } else if (c.status === "rescued") {
            display = "rescued";
          }

          return {
            registrationNumber: c.registrationNumber,
            fullName: c.contestant?.student?.fullName ?? "",
            groupId: group.id,
            status: c.status,
            eliminatedAt,
            rescuedAt: c.rescuedAtQuestionOrder ?? null,
            display,
          };
        })
      )
      .sort((a, b) => a.registrationNumber - b.registrationNumber);

    const remaining = contestants.filter(
      c => c.display === "active" || c.display === "rescued"
    );

    const eliminatedAtCurrent = revealed
      ? contestants.filter(
          c =>
            (c.display === "eliminated" || c.display === "banned") &&
            c.eliminatedAt === currentQuestionOrder
        )
      : [];

    const rescuedAtCurrent = contestants.filter(
      c => c.display === "rescued" && c.rescuedAt === currentQuestionOrder
    );

    const eliminatedBefore = contestants.filter(
      c =>
        (c.display === "eliminated" || c.display === "banned") &&
        c.eliminatedAt !== currentQuestionOrder
    );

    // Không vượt qua câu hiện tại: bị loại ở câu này, kể cả người sau đó được cứu.
    const failedCurrent = revealed
      ? contestants.filter(
          c =>
            c.eliminatedAt === currentQuestionOrder &&
            (OUT_STATUSES.includes(c.status) || c.status === "rescued")
        ).length
      : 0;

    // Vượt qua: đã tham gia câu này và vẫn còn trên sàn. Người được cứu ở chính
    // câu này (bị loại ở câu này hoặc câu trước) không tính là vượt qua. Người bị
    // admin gỡ loại (đưa về "Đang thi") thì tính là vượt qua.
    const passedCurrent = revealed
      ? contestants.filter(
          c =>
            c.status !== "not_started" &&
            (c.display === "active" || c.display === "rescued") &&
            !(c.status === "rescued" && c.rescuedAt === currentQuestionOrder)
        ).length
      : 0;

    const lastOrder = Math.max(
      currentQuestionOrder,
      ...contestants.map(c => c.eliminatedAt ?? 0),
      ...contestants.map(c => c.rescuedAt ?? 0)
    );
    const perQuestion: QuestionBreakdown[] = Array.from(
      { length: Math.max(lastOrder, 0) },
      (_, index) => {
        const order = index + 1;
        const isPending = order === currentQuestionOrder && !revealed;
        return {
          questionOrder: order,
          eliminated: isPending
            ? 0
            : contestants.filter(
                c =>
                  c.eliminatedAt === order &&
                  (OUT_STATUSES.includes(c.status) || c.status === "rescued")
              ).length,
          rescued: contestants.filter(c => c.rescuedAt === order).length,
        };
      }
    );

    return {
      contestants,
      remaining,
      eliminatedAtCurrent,
      rescuedAtCurrent,
      eliminatedBefore,
      totalOut: contestants.filter(
        c => c.display === "eliminated" || c.display === "banned"
      ).length,
      totalRescued: contestants.filter(c => c.display === "rescued").length,
      totalBanned: contestants.filter(c => c.display === "banned").length,
      passedCurrent,
      failedCurrent,
      perQuestion,
    };
  }, [listContestant, currentQuestionOrder, revealed]);
}

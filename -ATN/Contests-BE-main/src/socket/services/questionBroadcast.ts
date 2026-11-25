import { Server } from "socket.io";
import { MatchService } from "@/modules/match";
import { transformQuestionMedia } from "@/utils/mediaTransform";

/** Match tối thiểu cần để phát câu hỏi cho thí sinh. */
interface BroadcastMatch {
  id: number;
  slug: string | null;
  status: string;
  currentQuestion: number | null;
  remainingTime: number | null;
  questionPackageId: number;
}

/**
 * Room của thí sinh: app vào theo id, bản web vào theo slug. Phát cho cả hai,
 * Socket.IO tự loại trùng.
 */
export const studentRooms = (match: { id: number; slug: string | null }) =>
  match.slug ? [`match-${match.id}`, `match-${match.slug}`] : [`match-${match.id}`];

/**
 * Báo cho thí sinh biết Admin vừa chọn câu mới nhưng CHƯA chiếu: app hiện màn
 * hình "Chờ câu hỏi". Cố ý không gửi nội dung câu hỏi.
 */
export const announceQuestionPending = (
  io: Server,
  match: { id: number; slug: string | null },
  questionOrder: number
) => {
  io.of("/student")
    .to(studentRooms(match))
    .emit("match:questionPending", {
      matchId: match.id,
      matchSlug: match.slug,
      currentQuestion: questionOrder,
    });
};

/**
 * Admin bấm "Show" câu hỏi: gửi nội dung câu hiện tại cho thí sinh. Chỉ gửi
 * khi trận đang diễn ra. Trả về false nếu không gửi.
 */
export const revealQuestionToStudents = async (
  io: Server,
  match: BroadcastMatch
): Promise<boolean> => {
  if (match.status !== "ongoing" || !match.currentQuestion) {
    return false;
  }

  const question = await MatchService.CurrentQuestion(
    match.currentQuestion,
    match.questionPackageId
  );
  if (!question) {
    return false;
  }

  const options: unknown = question.options;
  io.of("/student")
    .to(studentRooms(match))
    .emit("match:questionShown", {
      matchId: match.id,
      matchSlug: match.slug,
      currentQuestion: match.currentQuestion,
      remainingTime: match.remainingTime ?? question.defaultTime,
      currentQuestionData: {
        order: match.currentQuestion,
        question: {
          id: question.id,
          intro: question.intro,
          content: question.content,
          questionType: question.questionType,
          difficulty: question.difficulty,
          defaultTime: question.defaultTime,
          score: question.score,
          options: Array.isArray(options)
            ? options
            : typeof options === "string"
            ? JSON.parse(options)
            : [],
          media: transformQuestionMedia(question.questionMedia),
        },
      },
    });
  return true;
};

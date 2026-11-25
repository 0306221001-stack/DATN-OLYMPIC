import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import EliminateGrid from "../Eliminate/EliminateGrid";
import EliminateSidebar from "../Eliminate/EliminateSidebar";
import type { MatchResults } from "../../hooks/useMatchResults";
import type {
  CurrentQuestion,
  ListContestant,
} from "../../types/control.type";

export interface Contestant {
  registration_number: number;
  fullname: string;
  status:
  | "not_started"
  | "in_progress"
  | "confirmed1"
  | "confirmed2"
  | "eliminated"
  | "rescued"
  | "banned"
  | "completed";
  eliminated_at_question_order: number | null;
  rescued_at_question_order?: number | null;
}

interface EliminateDisplayProps {
  ListContestant: ListContestant[];
  results: MatchResults;
  currentQuestionOrder: number;
  currentQuestion: CurrentQuestion | null;
  /** Admin đã công bố kết quả câu hiện tại (Eliminated / Rescued). */
  revealed: boolean;
}

/** Đáp án đúng kèm chữ cái phương án với câu trắc nghiệm: "B. 2x". */
const formatCorrectAnswer = (question: CurrentQuestion | null): string | null => {
  if (!question?.correctAnswer) return null;
  const options = Array.isArray(question.options) ? question.options : [];
  const index = options.findIndex(
    option =>
      String(option).trim().toLowerCase() ===
      question.correctAnswer.trim().toLowerCase()
  );
  if (question.questionType === "multiple_choice" && index >= 0) {
    return `${String.fromCharCode(65 + index)}. ${question.correctAnswer}`;
  }
  return question.correctAnswer;
};

export default function EliminateDisplay({
  ListContestant,
  results,
  currentQuestionOrder,
  currentQuestion,
  revealed,
}: EliminateDisplayProps) {
  useEffect(() => {
    document.title = "Thí sinh - kết quả";
  }, []);

  const groupOrder = useMemo(
    () => ListContestant.map(group => group.id),
    [ListContestant]
  );

  return (
    // Container với chiều cao trừ đi header (khoảng 200px)
    <div
      className="flex overflow-hidden"
      style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-1 overflow-hidden"
      >
        {/* Lưới thí sinh còn lại: người bị loại tự ẩn đi, được cứu thì hiện lại */}
        {/* pb-16 chừa chỗ cho nút "Thống kê" ở góc dưới trái */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-6 pb-16 pt-4">
          <EliminateGrid
            remaining={results.remaining}
            groupOrder={groupOrder}
            maxContestantColumn={ListContestant[0]?.match?.maxContestantColumn}
            currentQuestionOrder={currentQuestionOrder}
          />
        </div>

        {/* Bảng thông báo bên phải */}
        <div className="w-96 flex-shrink-0">
          <EliminateSidebar
            results={results}
            questionOrder={currentQuestionOrder}
            revealed={revealed}
            correctAnswerText={formatCorrectAnswer(currentQuestion)}
          />
        </div>
      </motion.div>
    </div>
  );
}

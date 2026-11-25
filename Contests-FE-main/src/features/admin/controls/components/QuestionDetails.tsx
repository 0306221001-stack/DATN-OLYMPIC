import React from "react";
import { type Question } from "../type/control.type";
import { useSocket } from "../../../../contexts/SocketContext";
import { useParams } from "react-router-dom";

import { useToast } from "@contexts/toastContext";
import {
  MAIN_QUESTION_COUNT,
  backupIndex,
  isBackupQuestion,
} from "@common/questionOrder";
interface QuestionDetailsProp {
  questions: Question[];
  currentQuestion?: number;
}

const QuestionDetails: React.FC<QuestionDetailsProp> = ({
  questions,
  currentQuestion,
}) => {
  const { showToast } = useToast();
  // Khai báo kiểu cho difficultyMap
  const difficultyMap: Record<
    "Alpha" | "Beta" | "Rc" | "Gold",
    { color: string; label: string }
  > = {
    Alpha: { color: "bg-blue-700", label: "α" },
    Beta: { color: "bg-purple-600", label: "β" },
    Rc: { color: "bg-red-600", label: "RC" },
    Gold: { color: "bg-yellow-600", label: "Au" },
  };

  const questionTypeMap: Record<
    "multiple_choice" | "essay" | "image" | "audio" | "video",
    { color: string; label: string }
  > = {
    multiple_choice: { color: "bg-green-600", label: "Trắc nghiệm" },
    essay: { color: "bg-indigo-600", label: "Tự luận" },
    image: { color: "bg-pink-600", label: "Hình ảnh" },
    audio: { color: "bg-orange-600", label: "Âm thanh" },
    video: { color: "bg-teal-600", label: "Video" },
  };

  const { match } = useParams();
  const { socket } = useSocket();

  const EmitGetCurrentQuestion = (
    match: string | undefined,
    questionOrder: number
  ) => {
    if (!socket || !match) return;
    socket.emit(
      "currentQuestion:get",
      { match, questionOrder },
      (err: any, response: any) => {
        if (err) {
          showToast(err.message, "error");
        } else {
          showToast(response.message, "success");
        }
      }
    );
  };
  const mainQuestions = questions.filter(
    q => !isBackupQuestion(q.questionOrder)
  );
  const backupQuestions = questions.filter(q =>
    isBackupQuestion(q.questionOrder)
  );

  return (
    <div className="w-1/5 bg-gradient-to-b from-blue-600 to-blue-800 text-white p-4 shadow-lg flex flex-col h-screen">
      <h2 className="text-2xl font-bold mb-2 tracking-tight text-center bg-blue-900 rounded-lg py-1">
        CÂU HỎI
      </h2>

      <div className="flex-grow overflow-hidden">
        <ul className="flex flex-col h-full gap-[0.35rem]">
          {mainQuestions.map((q) => {
            const isCurrent = q.questionOrder === currentQuestion;
            const difficulty = difficultyMap[
              q.difficulty as keyof typeof difficultyMap
            ] || {
              color: "bg-gray-600",
              label: "?",
            };

            const questionType = questionTypeMap[
              q.questionType as keyof typeof questionTypeMap
            ] || {
              color: "bg-gray-600",
              label: "?",
            };

            return (
              <li
                onClick={() => EmitGetCurrentQuestion(match, q.questionOrder)}
                key={q.id}
                className={`rounded-lg cursor-pointer transition-all duration-200 shadow-md flex items-center p-1 relative ${
                  isCurrent
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 border-2 border-red-500"
                    : "bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 border border-blue-300"
                }`}
                style={{
                  flex: "1 1 0",
                  minHeight: 0,
                  maxHeight: `calc((100vh - ${
                    backupQuestions.length > 0 ? 190 : 100
                  }px) / ${MAIN_QUESTION_COUNT})`,
                }}
              >
                {isCurrent && (
                  <>
                    <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 text-red-500 text-2xl animate-pulse">
                      ▶
                    </div>
                    <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 text-red-500 text-2xl animate-pulse">
                      ◀
                    </div>
                  </>
                )}

                <div className="flex justify-between w-full items-center px-2">
                  <span
                    className={`text-3xl sm:text-4xl md:text-5xl font-bold ${
                      isCurrent ? "text-white" : "text-blue-100"
                    }`}
                  >
                    {q.questionOrder}
                  </span>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-sm md:text-lg font-semibold whitespace-nowrap px-2 py-0.5 ${difficulty.color} rounded text-white`}
                    >
                      {difficulty.label}
                    </span>
                    <span
                      className={`text-sm sm:text-base md:text-lg font-medium ${questionType.color} px-2 py-0.5 rounded`}
                    >
                      {questionType.label}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Câu dự phòng: dùng khi đã hết 13 câu chính mà vẫn cần thêm câu */}
      {backupQuestions.length > 0 && (
        <div className="mt-3 flex-shrink-0">
          <h3 className="text-sm font-bold tracking-wide text-center bg-orange-600 rounded-lg py-1 mb-2">
            CÂU DỰ PHÒNG ({backupQuestions.length})
          </h3>
          <div className="grid grid-cols-4 gap-1.5">
            {backupQuestions.map(q => {
              const isCurrent = q.questionOrder === currentQuestion;
              const difficulty = difficultyMap[
                q.difficulty as keyof typeof difficultyMap
              ] || { color: "bg-gray-600", label: "?" };

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => EmitGetCurrentQuestion(match, q.questionOrder)}
                  title={`Câu dự phòng ${backupIndex(q.questionOrder)} (thứ tự ${q.questionOrder} trong gói)`}
                  className={`rounded-md py-1 flex flex-col items-center shadow-md transition-all duration-200 ${
                    isCurrent
                      ? "bg-orange-500 border-2 border-red-500"
                      : "bg-orange-400/80 hover:bg-orange-500 border border-orange-300"
                  }`}
                >
                  <span className="text-lg font-bold leading-none">
                    DP{backupIndex(q.questionOrder)}
                  </span>
                  <span
                    className={`mt-0.5 text-[10px] font-semibold px-1 rounded ${difficulty.color}`}
                  >
                    {difficulty.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionDetails;

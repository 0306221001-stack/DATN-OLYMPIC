import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { questionLabel } from "@common/questionOrder";
import type {
  MatchResults,
  ResultContestant,
} from "../../hooks/useMatchResults";

interface EliminateSidebarProps {
  results: MatchResults;
  questionOrder: number;
  /** Admin đã bấm "Hiển thị thí sinh bị loại" cho câu hiện tại chưa. */
  revealed: boolean;
  /** Đáp án đúng đã định dạng sẵn (ví dụ "B. 2x"), null nếu không có. */
  correctAnswerText: string | null;
}

const StatTile: React.FC<{
  label: string;
  value: string;
  tone: "green" | "red" | "blue";
}> = ({ label, value, tone }) => {
  const toneClass = {
    green: "border-green-300 bg-green-50 text-green-800",
    red: "border-red-300 bg-red-50 text-red-800",
    blue: "border-blue-300 bg-blue-50 text-blue-800",
  }[tone];
  return (
    <div className={`rounded-lg border-2 px-2 py-2 text-center ${toneClass}`}>
      <div
        className={`font-black leading-none tabular-nums ${
          value.length > 5 ? "text-xl" : value.length > 3 ? "text-2xl" : "text-3xl"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
};

const ContestantRow: React.FC<{
  contestant: ResultContestant;
  index: number;
  tone: "red" | "green" | "gray";
  note?: string;
}> = ({ contestant, index, tone, note }) => {
  const badgeClass = {
    red: "bg-red-500 border-red-600",
    green: "bg-green-500 border-green-600",
    gray: "bg-gray-700 border-gray-600",
  }[tone];
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.3, delay: Math.min(index, 20) * 0.05 }}
      className="flex items-center gap-3 rounded-lg bg-white px-2 py-1.5 shadow-sm border border-gray-200"
    >
      <span
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold text-white ${badgeClass}`}
      >
        {contestant.registrationNumber}
      </span>
      <span className="flex-1 truncate font-semibold text-gray-800">
        {contestant.fullName || "Chưa có tên"}
      </span>
      {note && (
        <span className="flex-shrink-0 text-xs font-medium text-gray-500">
          {note}
        </span>
      )}
    </motion.li>
  );
};

const EliminateSidebar: React.FC<EliminateSidebarProps> = ({
  results,
  questionOrder,
  revealed,
  correctAnswerText,
}) => {
  const label = questionLabel(questionOrder);
  const total = results.contestants.length;

  return (
    <div className="h-full bg-gradient-to-b from-gray-50 to-gray-100 border-l border-gray-300 shadow-lg flex flex-col">
      {/* Kết quả câu hỏi */}
      <div className="flex-shrink-0 p-4 bg-white border-b border-gray-200 shadow-sm space-y-3">
        <h3 className="text-2xl font-bold text-center text-blue-800">
          {questionOrder > 0
            ? `Kết quả ${label.toLowerCase()}`
            : "Trận đấu chưa bắt đầu"}
        </h3>

        {revealed ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-green-600 px-3 py-2 text-center text-white shadow"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-green-100">
              Đáp án đúng
            </div>
            <div className="text-xl font-black break-words">
              {correctAnswerText ?? "Không có đáp án"}
            </div>
          </motion.div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-blue-300 px-3 py-3 text-center text-blue-700 font-semibold animate-pulse">
            Đang chờ công bố kết quả...
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <StatTile
            label="Vượt qua"
            value={revealed ? String(results.passedCurrent) : "--"}
            tone="green"
          />
          <StatTile
            label="Không qua"
            value={revealed ? String(results.failedCurrent) : "--"}
            tone="red"
          />
          <StatTile
            label="Còn lại"
            value={`${results.remaining.length}/${total}`}
            tone="blue"
          />
        </div>
      </div>

      {/* Danh sách thông báo */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section className="rounded-lg bg-red-50/60 p-3 border border-red-200">
          <h4 className="text-lg font-semibold text-red-700 mb-2 flex items-center">
            <span className="w-3 h-3 bg-red-500 rounded-full mr-2" />
            Bị loại ở {label.toLowerCase()} ({results.eliminatedAtCurrent.length})
          </h4>
          {!revealed ? (
            <p className="py-3 text-center text-gray-500">
              Chưa công bố danh sách bị loại
            </p>
          ) : results.eliminatedAtCurrent.length === 0 ? (
            <p className="py-3 text-center text-gray-600">
              🎉 Không có thí sinh nào bị loại ở câu này
            </p>
          ) : (
            <ul className="space-y-1.5">
              <AnimatePresence>
                {results.eliminatedAtCurrent.map((c, index) => (
                  <ContestantRow
                    key={`out-${c.registrationNumber}`}
                    contestant={c}
                    index={index}
                    tone={c.display === "banned" ? "gray" : "red"}
                    note={c.display === "banned" ? "Bị cấm" : undefined}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        {results.rescuedAtCurrent.length > 0 && (
          <section className="rounded-lg bg-green-50/60 p-3 border border-green-200">
            <h4 className="text-lg font-semibold text-green-700 mb-2 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse" />
              Được cứu trợ ({results.rescuedAtCurrent.length})
            </h4>
            <ul className="space-y-1.5">
              <AnimatePresence>
                {results.rescuedAtCurrent.map((c, index) => (
                  <ContestantRow
                    key={`rescued-${c.registrationNumber}`}
                    contestant={c}
                    index={index}
                    tone="green"
                    note={
                      c.eliminatedAt ? `Loại ở ${questionLabel(c.eliminatedAt).toLowerCase()}` : undefined
                    }
                  />
                ))}
              </AnimatePresence>
            </ul>
          </section>
        )}

        {results.eliminatedBefore.length > 0 && (
          <section className="rounded-lg bg-white p-3 border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-700 mb-2 flex items-center">
              <span className="w-3 h-3 bg-gray-400 rounded-full mr-2" />
              Bị loại ở các câu trước ({results.eliminatedBefore.length})
            </h4>
            <div className="grid grid-cols-5 gap-1.5">
              {results.eliminatedBefore.map(c => (
                <div
                  key={`before-${c.registrationNumber}`}
                  title={`${c.fullName} - ${c.display === "banned" ? "Bị cấm" : questionLabel(c.eliminatedAt)}`}
                  className={`flex h-10 items-center justify-center rounded-md border text-xs font-bold text-white ${
                    c.display === "banned"
                      ? "bg-gray-600 border-gray-500"
                      : "bg-red-400 border-red-500"
                  }`}
                >
                  {c.registrationNumber}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default EliminateSidebar;

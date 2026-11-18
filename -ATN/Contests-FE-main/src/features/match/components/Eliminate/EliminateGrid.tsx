import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import type { Icon } from "../../types";
import type { Variants, Easing } from "framer-motion";
import type { ListContestant } from "@features/match/types/control.type";

interface EliminateGridProps {
  icons: Icon[];
  recentlyRestored: number[];
  /** Không còn dùng: sơ đồ luôn xếp 10 thí sinh mỗi hàng. */
  maxContestantColumn?: number;
  listContestant?: ListContestant[];
}

/** Số thí sinh trên mỗi hàng của sơ đồ. */
const CONTESTANTS_PER_ROW = 10;

/** Tỉ lệ cao/rộng của một ô khi còn dư chỗ theo chiều dọc. */
const TILE_ASPECT = 1.25;

const iconVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20, rotate: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    rotate: 0,
    transition: {
      duration: 0.8,
      ease: [0.4, 0, 0.2, 1] as Easing,
    },
  },
  disintegrating: { opacity: 0, scale: 0.9, transition: { duration: 1 } },
};

/** Đáp án dài hơn ngưỡng này thì chuyển sang chế độ "văn bản" chiếm cả ô. */
const LONG_ANSWER_LENGTH = 12;

/**
 * Chọn cỡ chữ lớn nhất (12..28px) mà đáp án còn vừa khung rộng x cao; không
 * vừa thì dùng 12px và cho biết số dòng tối đa để cắt bằng dấu "…".
 */
const fitAnswerFont = (text: string, width: number, height: number) => {
  const length = text.length;
  for (let font = 28; font >= 12; font -= 1) {
    const perLine = Math.floor(width / (font * 0.56));
    const lines = Math.floor(height / (font * 1.22));
    if (perLine >= 4 && lines >= 1 && perLine * lines >= length * 1.08) {
      return { font, lines };
    }
  }
  return { font: 12, lines: Math.max(1, Math.floor(height / (12 * 1.22))) };
};

interface AnswerLabelProps {
  text: string;
  /** Khung còn trống trong ô (dưới số báo danh), dùng cho đáp án dài. */
  boxWidth: number;
  boxHeight: number;
}

/**
 * Nhãn đáp án dưới số báo danh.
 * - Đáp án ngắn (A/B/C/D, số, vài chữ): nhãn trắng, chữ to theo cỡ ô.
 * - Đáp án dài (tự luận): chữ tự co cho vừa phần ô còn lại, xuống dòng; quá dài
 *   mới bị cắt bằng "…" (đưa chuột vào xem được nguyên văn).
 */
const AnswerLabel: React.FC<AnswerLabelProps> = ({ text, boxWidth, boxHeight }) => {
  const clean = text.replace(/\s+/g, " ").trim();
  const isLong = clean.length > LONG_ANSWER_LENGTH;

  if (!isLong) {
    const scale = clean.length <= 2 ? 0.55 : clean.length <= 6 ? 0.38 : 0.28;
    return (
      <span
        title={text}
        className="rounded-md bg-white/95 text-gray-900 font-extrabold leading-tight shadow"
        style={{
          fontSize: `max(11px, ${scale}em)`,
          maxWidth: "92%",
          padding: "0.05em 0.3em",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textShadow: "none",
        }}
      >
        {clean}
      </span>
    );
  }

  const { font, lines } = fitAnswerFont(clean, boxWidth - 8, boxHeight - 6);
  return (
    <span
      title={text}
      className="rounded-md bg-white/95 text-gray-900 font-bold shadow"
      style={{
        width: "100%",
        fontSize: `${font}px`,
        lineHeight: 1.22,
        padding: "3px 4px",
        textAlign: "center",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        textShadow: "none",
      }}
    >
      {clean}
    </span>
  );
};

const EliminateGrid: React.FC<EliminateGridProps> = ({
  listContestant,
  icons,
  recentlyRestored,
}) => {
  // Đo vùng chứa để chia ô: 10 ô mỗi hàng, tự thu nhỏ khi có nhiều hàng.
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Ô đang được phóng to để đọc trọn đáp án (bấm vào ô; Esc hoặc bấm lại để đóng).
  const [expanded, setExpanded] = useState<number | null>(null);
  useEffect(() => {
    if (expanded === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  // Số báo danh -> đáp án thí sinh chọn ở câu hiện tại (có sau khi hết giờ).
  const answerByRegistration = new Map<number, string>();
  listContestant?.forEach(group =>
    group?.contestantMatches?.forEach(contestant => {
      if (contestant?.answer) {
        answerByRegistration.set(contestant.registrationNumber, contestant.answer);
      }
    })
  );

  const hasLongAnswer = (registrationNumber: number) =>
    (answerByRegistration.get(registrationNumber) ?? "").replace(/\s+/g, " ").trim()
      .length > LONG_ANSWER_LENGTH;

  // Thứ tự hiển thị: theo nhóm (nếu có), rồi xếp liên tục 10 ô mỗi hàng.
  let ordered: Icon[] = icons.filter(icon => icon.isActive);
  if (listContestant && listContestant.length > 0) {
    ordered = listContestant.flatMap(group =>
      icons
        .filter(icon => icon.isActive)
        .filter(icon =>
          group?.contestantMatches?.some(
            contestant => contestant?.registrationNumber === icon.registrationNumber
          )
        )
    );
  }

  if (ordered.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center text-gray-500"
      >
        No contestants
      </div>
    );
  }

  const rows: Icon[][] = [];
  for (let i = 0; i < ordered.length; i += CONTESTANTS_PER_ROW) {
    rows.push(ordered.slice(i, i + CONTESTANTS_PER_ROW));
  }

  // Kích thước ô: rộng = 1/10 bề ngang; cao = tỉ lệ đứng, nhưng không vượt
  // phần chiều cao chia đều cho các hàng (nhiều hàng thì ô thấp lại).
  const gap = Math.max(6, Math.min(14, size.width * 0.007));
  const tileWidth = Math.max(
    0,
    (size.width - gap * (CONTESTANTS_PER_ROW - 1)) / CONTESTANTS_PER_ROW
  );
  const tileHeight = Math.max(
    0,
    Math.min(
      tileWidth * TILE_ASPECT,
      (size.height - gap * (rows.length - 1)) / rows.length
    )
  );
  const longestNumber = Math.max(
    ...ordered.map(i => String(i.registrationNumber).length)
  );
  const fontSize = Math.max(
    12,
    Math.min(tileWidth, tileHeight) * (longestNumber >= 3 ? 0.36 : 0.48)
  );
  const ready = tileWidth > 0 && tileHeight > 0;

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden flex flex-col justify-center"
      style={{ gap: `${gap}px` }}
    >
      {ready &&
        rows.map((row, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="flex justify-start"
            style={{ gap: `${gap}px` }}
          >
            {row.map((icon, indexInRow) => (
              <motion.div
                key={icon.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: (rowIndex * CONTESTANTS_PER_ROW + indexInRow) * 0.02,
                }}
                className="relative flex-shrink-0"
                style={{
                  width: tileWidth,
                  height: tileHeight,
                  cursor: answerByRegistration.has(icon.registrationNumber) ? "pointer" : undefined,
                }}
                onClick={() =>
                  answerByRegistration.has(icon.registrationNumber) &&
                  setExpanded(icon.registrationNumber)
                }
              >
                <motion.div
                  variants={iconVariants}
                  initial="hidden"
                  animate={
                    // Thí sinh bị loại (đỏ) và bị cấm (xám đen) vẫn hiện trên sơ đồ.
                    icon.isFading ? "disintegrating" : "visible"
                  }
                  className={`
                    w-full h-full rounded-lg flex items-center justify-center
                    shadow-lg border-2
                    ${icon.isBanned
                    ? "bg-gray-700 text-gray-300 border-gray-600 shadow-gray-800/40"
                    : icon.isDisintegrated
                    ? "bg-red-500 text-white border-red-400 shadow-red-500/30"
                    : recentlyRestored.includes(icon.registrationNumber)
                      ? "bg-green-500 text-white animate-pulse shadow-green-400/50 border-green-400"
                      : icon.isRescued
                      ? "bg-green-500 text-white animate-pulse shadow-green-400/50 border-green-400"
                      : "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-400/50 border-blue-400"
                    }
                  `}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  <div
                    className="flex flex-col items-center justify-center text-center select-none"
                    style={{
                      width: "100%",
                      height: "100%",
                      padding: "2px",
                      overflow: "hidden",
                      gap: "0.12em",
                    }}
                  >
                    <span
                      className="font-black leading-none drop-shadow-lg"
                      style={{
                        textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
                        // Đáp án dài: thu nhỏ số báo danh để nhường chỗ cho nội dung.
                        fontSize: hasLongAnswer(icon.registrationNumber) ? "0.45em" : undefined,
                      }}
                    >
                      {icon.registrationNumber}
                    </span>
                    {/* Đáp án thí sinh chọn ở câu hiện tại: ngay dưới SBD */}
                    {answerByRegistration.has(icon.registrationNumber) &&
                      !icon.isFading && (
                        <AnswerLabel
                          text={answerByRegistration.get(icon.registrationNumber) ?? ""}
                          boxWidth={tileWidth}
                          boxHeight={
                            tileHeight -
                            fontSize * (hasLongAnswer(icon.registrationNumber) ? 0.45 : 1) -
                            12
                          }
                        />
                      )}
                  </div>
                </motion.div>

                {/* Particles Effect */}
                {icon.particles.length > 0 &&
                  icon.particles.map(particle => (
                    <motion.div
                      key={particle.id}
                      initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                      animate={{
                        opacity: 0,
                        scale: 0.3,
                        x: particle.tx,
                        y: particle.ty,
                        rotate: particle.rotate,
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute rounded-full bg-blue-600 pointer-events-none shadow-lg"
                      style={{
                        width: `${Math.max(3, particle.size * 0.3)}px`,
                        height: `${Math.max(3, particle.size * 0.3)}px`,
                        left: particle.left,
                        top: particle.top,
                      }}
                    />
                  ))}
              </motion.div>
            ))}
          </div>
        ))}
      {expanded !== null &&
        answerByRegistration.has(expanded) &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-8"
            onClick={() => setExpanded(null)}
          >
            <div
              className="max-h-full w-full max-w-5xl overflow-auto rounded-2xl bg-white p-10 text-gray-900 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-4 text-4xl font-black text-blue-600">
                Thí sinh SBD {expanded}
              </div>
              <div
                className="whitespace-pre-wrap font-semibold leading-snug"
                style={{
                  overflowWrap: "anywhere",
                  fontSize:
                    (answerByRegistration.get(expanded) ?? "").length > 300 ? "1.5rem" : "2.5rem",
                }}
              >
                {answerByRegistration.get(expanded)}
              </div>
              <div className="mt-6 text-sm text-gray-500">Bấm ra ngoài hoặc nhấn Esc để đóng</div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default EliminateGrid;
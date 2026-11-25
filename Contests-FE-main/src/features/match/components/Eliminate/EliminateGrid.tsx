import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ResultContestant } from "../../hooks/useMatchResults";

interface EliminateGridProps {
  /** Thí sinh còn trên sàn thi; người bị loại đã được lọc ra nên tự ẩn đi. */
  remaining: ResultContestant[];
  /** Thứ tự nhóm (trọng tài) để xuống dòng giữa các nhóm. */
  groupOrder: number[];
  maxContestantColumn?: number;
  currentQuestionOrder: number;
}

type GridItem =
  | { kind: "contestant"; contestant: ResultContestant }
  | { kind: "break"; id: string };

const BREAK_HEIGHT = 4;

/**
 * Chọn số cột cho ô vuông lớn nhất mà cả lưới vẫn nằm gọn trong khung
 * [width] x [height]. Mỗi nhóm bắt đầu ở hàng mới và có vạch ngăn giữa các nhóm.
 */
const calculateBestLayout = (
  groupSizes: number[],
  maxCols: number,
  width: number,
  height: number,
  gap: number
) => {
  const total = groupSizes.reduce((sum, n) => sum + n, 0);
  const maxColumns = Math.max(1, Math.min(maxCols || 10, total));
  const breaks = Math.max(0, groupSizes.length - 1);
  let best = { columns: 1, size: 0 };

  for (let cols = 1; cols <= maxColumns; cols++) {
    const rows = groupSizes.reduce((sum, n) => sum + Math.ceil(n / cols), 0);
    const byWidth = (width - gap * (cols - 1)) / cols;
    const byHeight =
      (height - gap * (rows - 1 + breaks) - BREAK_HEIGHT * breaks) / rows;
    const size = Math.floor(Math.min(byWidth, byHeight));
    if (size > best.size) best = { columns: cols, size };
  }

  return { columns: best.columns, size: Math.max(20, best.size) };
};

/** Theo dõi kích thước thật của khung chứa lưới. */
const useElementSize = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, ...size };
};

const EliminateGrid: React.FC<EliminateGridProps> = ({
  remaining,
  groupOrder,
  maxContestantColumn,
  currentQuestionOrder,
}) => {
  const { ref: containerRef, width, height } = useElementSize();

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      {width > 0 && height > 0 && (
        <GridContent
          remaining={remaining}
          groupOrder={groupOrder}
          maxContestantColumn={maxContestantColumn}
          currentQuestionOrder={currentQuestionOrder}
          width={width}
          height={height}
        />
      )}
    </div>
  );
};

const GridContent: React.FC<
  EliminateGridProps & { width: number; height: number }
> = ({
  remaining,
  groupOrder,
  maxContestantColumn,
  currentQuestionOrder,
  width,
  height,
}) => {
  if (remaining.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full h-full flex flex-col items-center justify-center text-gray-500"
      >
        <span className="text-6xl mb-4">🔔</span>
        <p className="text-3xl font-bold">Không còn thí sinh nào trên sàn thi</p>
      </motion.div>
    );
  }

  // Giữ thứ tự theo nhóm, chèn vạch ngăn giữa các nhóm còn thí sinh
  const items: GridItem[] = [];
  const groupSizes: number[] = [];
  const groups = groupOrder.length > 0 ? groupOrder : [remaining[0].groupId];
  groups.forEach(groupId => {
    const groupItems = remaining.filter(c =>
      groupOrder.length > 0 ? c.groupId === groupId : true
    );
    if (groupItems.length === 0) return;
    if (items.length > 0) {
      items.push({ kind: "break", id: `break-${groupId}` });
    }
    groupSizes.push(groupItems.length);
    groupItems.forEach(contestant =>
      items.push({ kind: "contestant", contestant })
    );
  });

  const gapSize = Math.round(
    Math.max(2, Math.min(8, 100 / Math.sqrt(remaining.length)))
  );
  const { columns, size } = calculateBestLayout(
    groupSizes,
    maxContestantColumn ?? 10,
    width,
    height,
    gapSize
  );
  const fontSize = `${Math.max(10, Math.round(size * 0.42))}px`;

  return (
    <div className="w-full h-full overflow-hidden">
      <motion.div
        layout
        className="w-full h-full grid place-content-center"
        style={{
          gridTemplateColumns: `repeat(${columns}, ${size}px)`,
          gap: `${gapSize}px`,
        }}
      >
        {/* Ô bị loại co lại tại chỗ trước, xong mới dồn các ô còn lại */}
        <AnimatePresence>
          {items.map(item => {
            if (item.kind === "break") {
              return (
                <motion.div
                  layout
                  key={item.id}
                    className="col-span-full flex items-center"
                  style={{ height: BREAK_HEIGHT }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="w-full h-px bg-black/30" />
                </motion.div>
              );
            }

            const c = item.contestant;
            const justRescued =
              c.display === "rescued" && c.rescuedAt === currentQuestionOrder;

            return (
              <motion.div
                layout
                key={`contestant-${c.registrationNumber}`}
                title={c.fullName}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                // Bị loại: rung nhẹ, chuyển đỏ rồi thu nhỏ biến mất
                exit={{
                  scale: [1, 1.12, 0.2],
                  opacity: [1, 1, 0],
                  rotate: [0, -6, 12],
                  backgroundColor: ["#3b82f6", "#ef4444", "#ef4444"],
                  transition: { duration: 1.1, ease: "easeInOut" },
                }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                className={`relative w-full rounded-lg flex items-center justify-center shadow-lg border-2 text-white ${
                  justRescued
                    ? "bg-green-500 border-green-300 shadow-green-400/60 animate-pulse"
                    : c.display === "rescued"
                      ? "bg-green-500 border-green-400 shadow-green-400/50"
                      : "bg-blue-500 border-blue-400 shadow-blue-400/50"
                }`}
                style={{ width: size, height: size, fontSize }}
              >
                <span
                  className="font-black leading-none select-none"
                  style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}
                >
                  {c.registrationNumber}
                </span>
                {justRescued && (
                  <span className="absolute -top-2 -right-2 text-base">🛟</span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default EliminateGrid;

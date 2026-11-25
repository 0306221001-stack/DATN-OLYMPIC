import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { isBackupQuestion, questionLabel, backupIndex } from "@common/questionOrder";
import type { MatchResults } from "../../hooks/useMatchResults";

interface MatchStatsDashboardProps {
  results: MatchResults;
  open: boolean;
  onToggle: () => void;
}

// Đỏ = bị loại, xanh ngọc = được cứu (đã kiểm tra phân biệt được với người mù màu đỏ-lục)
const ELIMINATED_COLOR = "#dc2626";
const RESCUED_COLOR = "#0d9488";

const shortLabel = (order: number) =>
  isBackupQuestion(order) ? `DP${backupIndex(order)}` : `C${order}`;

const Kpi: React.FC<{ label: string; value: number; accent: string }> = ({
  label,
  value,
  accent,
}) => (
  <div className="rounded-xl bg-white/10 px-4 py-3 border border-white/15">
    <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
      {label}
    </div>
    <div className="mt-1 text-4xl font-black text-white tabular-nums">{value}</div>
  </div>
);

/**
 * Dashboard thống kê trên màn hình chiếu: thí sinh còn lại / bị loại / được cứu
 * và số bị loại ở từng câu. Bấm nút (hoặc phím T) để mở hoặc thu lại.
 */
const MatchStatsDashboard: React.FC<MatchStatsDashboardProps> = ({
  results,
  open,
  onToggle,
}) => {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (event.key === "t" || event.key === "T") onToggle();
      if (event.key === "Escape" && open) onToggle();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onToggle, open]);

  const total = results.contestants.length;
  const chartData = results.perQuestion.map(q => ({
    name: shortLabel(q.questionOrder),
    fullName: questionLabel(q.questionOrder),
    "Bị loại": q.eliminated,
    "Được cứu": q.rescued,
  }));
  const questionsWithOut = results.perQuestion.filter(q => q.eliminated > 0);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        title="Thống kê (phím T)"
        // Mờ khi không dùng để không gây chú ý trên màn chiếu
        className={`fixed bottom-4 left-4 z-[60] flex items-center gap-2 rounded-full bg-slate-900/70 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur transition-opacity hover:opacity-100 ${
          open ? "opacity-100" : "opacity-40"
        }`}
      >
        <span aria-hidden>📊</span>
        {open ? "Thu lại thống kê" : "Thống kê"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="stats-dashboard"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed inset-x-6 bottom-16 top-6 z-[55] flex flex-col overflow-hidden rounded-2xl bg-slate-900/95 text-white shadow-2xl backdrop-blur"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-2xl font-bold">Thống kê trận đấu</h2>
              <button
                type="button"
                onClick={onToggle}
                className="rounded-lg px-3 py-1 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Thu lại ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi label="Tổng thí sinh" value={total} accent="#94a3b8" />
                <Kpi
                  label="Không bị loại (còn lại)"
                  value={results.remaining.length}
                  accent="#3b82f6"
                />
                <Kpi label="Bị loại" value={results.totalOut} accent={ELIMINATED_COLOR} />
                <Kpi
                  label="Lượt được cứu"
                  value={results.perQuestion.reduce((sum, q) => sum + q.rescued, 0)}
                  accent={RESCUED_COLOR}
                />
              </div>
              {results.totalBanned > 0 && (
                <p className="text-sm text-slate-300">
                  Trong số bị loại có {results.totalBanned} thí sinh bị cấm do vi phạm.
                </p>
              )}

              <section className="rounded-xl bg-white/5 p-4 border border-white/10">
                <h3 className="mb-3 text-lg font-semibold">Số thí sinh bị loại từng câu</h3>
                {chartData.length === 0 ? (
                  <p className="py-8 text-center text-slate-400">Trận đấu chưa bắt đầu</p>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} barGap={2} margin={{ top: 20, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "#cbd5e1", fontSize: 13 }}
                          axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: "#94a3b8", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.06)" }}
                          contentStyle={{
                            background: "#0f172a",
                            border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 8,
                            color: "#f8fafc",
                          }}
                          labelStyle={{ color: "#f8fafc", fontWeight: 600 }}
                          itemStyle={{ color: "#e2e8f0" }}
                          labelFormatter={(_, payload) =>
                            payload?.[0]?.payload?.fullName ?? ""
                          }
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: 8 }}
                          formatter={(value: string) => (
                            <span style={{ color: "#e2e8f0" }}>{value}</span>
                          )}
                        />
                        <Bar dataKey="Bị loại" fill={ELIMINATED_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28}>
                          <LabelList
                            dataKey="Bị loại"
                            position="top"
                            fill="#e2e8f0"
                            fontSize={12}
                            formatter={(value: number) => (value > 0 ? value : "")}
                          />
                        </Bar>
                        <Bar dataKey="Được cứu" fill={RESCUED_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28}>
                          <LabelList
                            dataKey="Được cứu"
                            position="top"
                            fill="#e2e8f0"
                            fontSize={12}
                            formatter={(value: number) => (value > 0 ? value : "")}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section className="rounded-xl bg-white/5 p-4 border border-white/10">
                <h3 className="mb-3 text-lg font-semibold">Danh sách bị loại theo câu</h3>
                {questionsWithOut.length === 0 ? (
                  <p className="py-4 text-center text-slate-400">Chưa có thí sinh nào bị loại</p>
                ) : (
                  <div className="space-y-3">
                    {questionsWithOut.map(q => {
                      const list = results.contestants.filter(
                        c =>
                          c.eliminatedAt === q.questionOrder &&
                          c.display !== "active"
                      );
                      return (
                        <div key={q.questionOrder} className="flex gap-3">
                          <div className="w-32 flex-shrink-0 pt-1 font-semibold text-slate-200">
                            {questionLabel(q.questionOrder)}
                            <span className="ml-1 text-slate-400">({q.eliminated})</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {list.map(c => (
                              <span
                                key={c.registrationNumber}
                                title={`${c.fullName}${c.display === "rescued" ? " - đã được cứu" : c.display === "banned" ? " - bị cấm" : ""}`}
                                className={`rounded-md px-2 py-1 text-sm font-bold ${
                                  c.display === "rescued"
                                    ? "bg-teal-600/30 text-teal-100 ring-1 ring-teal-400/60"
                                    : c.display === "banned"
                                      ? "bg-slate-600 text-slate-100"
                                      : "bg-red-600/30 text-red-100 ring-1 ring-red-400/60"
                                }`}
                              >
                                {c.registrationNumber}
                                {c.display === "rescued" && " 🛟"}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MatchStatsDashboard;

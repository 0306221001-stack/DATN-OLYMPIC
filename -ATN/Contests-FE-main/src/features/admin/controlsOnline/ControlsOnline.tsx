import React, { useState } from "react";
import { PlayIcon, StopIcon } from "@heroicons/react/24/outline";
import { CircularProgress, Alert, Snackbar } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminSocket } from "./hooks/useAdminSocket";
import { useToast } from "@contexts/toastContext";
import Confirm from "@components/Confirm";

interface MatchData {
  id: number;
  slug: string;
  name: string;
  currentQuestion: number;
  remainingTime: number;
  status: "upcoming" | "ongoing" | "finished";
  totalQuestions: number;
  defaultTime: number;
}

interface ControlsOnlineProps {
  matchData?: MatchData | null;
}

const ControlsOnline: React.FC<ControlsOnlineProps> = ({ matchData }) => {
  const { examState, isConnected, startExam, endExam } = useAdminSocket();
  const queryClient = useQueryClient();
  const [isConfirmEndOpen, setIsConfirmEndOpen] = useState(false);

  const isEnded = matchData?.status === "finished" || examState.isEnded;
  const isRunning =
    !isEnded && (matchData?.status === "ongoing" || examState.isStarted);

  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  const { showToast } = useToast();

  const handleStartExam = async () => {
    try {
      const response = await startExam();
      if (response.success) {
        showToast("Trận đấu đã bắt đầu thành công!", "success");
      } else {
        showToast(response.message || "Không thể bắt đầu trận đấu", "error");
      }
    } catch (error) {
      showToast("Có lỗi xảy ra khi bắt đầu trận đấu", "error");
      console.error("Error starting exam:", error);
    }
  };

  const handleEndExam = async () => {
    try {
      const response = await endExam();
      if (response.success) {
        showToast(
          "Đã kết thúc trận đấu. Thí sinh sẽ thấy màn hình hoàn thành bài thi.",
          "success"
        );
        queryClient.invalidateQueries({ queryKey: ["MatchInfo"] });
      } else {
        showToast(response.message || "Không thể kết thúc trận đấu", "error");
      }
    } catch (error) {
      showToast("Có lỗi xảy ra khi kết thúc trận đấu", "error");
      console.error("Error ending exam:", error);
    }
  };

  const handleCloseNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      {!isConnected && (
        <Alert severity="warning" className="mb-4">
          Mất kết nối socket. Đang thử kết nối lại...
        </Alert>
      )}

      {/* Điều khiển chính */}
      <div className="bg-white p-6 rounded-xl w-full border-l-4 border-l-blue-500">
        {/* Trạng thái thi */}
        <div className="mb-4 rounded-lg">
          <div className="mb-3">
            {isEnded ? (
              <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-gray-700 font-medium">
                  Trận đấu đã kết thúc, thí sinh không nộp đáp án được nữa
                </span>
              </div>
            ) : isRunning ? (
              <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 font-medium">
                  Học sinh có thể nhận câu hỏi (trận đã bắt đầu)
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-orange-700 font-medium">
                  ⚠️ Học sinh chưa thể nhận câu hỏi (cần bắt đầu trận trước)
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-4">
          {/* Row 1: Start Match và End Match */}
          <button
            onClick={handleStartExam}
            disabled={
              (matchData && matchData.status !== "upcoming") ||
              examState.isStarted ||
              examState.isLoading ||
              !isConnected
            }
            className={`px-20 py-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors ${
              (matchData && matchData.status !== "upcoming") ||
              examState.isStarted ||
              examState.isLoading ||
              !isConnected
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
          >
            {examState.isLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <PlayIcon className="h-5 w-5" />
            )}
            <span>
              {isEnded
                ? "Đã kết thúc"
                : (matchData && matchData.status !== "upcoming") ||
                  examState.isStarted
                ? "Đã bắt đầu"
                : "Bắt Đầu Trận"}
            </span>
          </button>

          <button
            onClick={() => setIsConfirmEndOpen(true)}
            disabled={!isRunning || examState.isLoading || !isConnected}
            className={`px-12 py-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors ${
              !isRunning || examState.isLoading || !isConnected
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-red-500 text-white hover:bg-red-600"
            }`}
          >
            <StopIcon className="h-5 w-5" />
            <span>Kết Thúc Trận</span>
          </button>
        </div>
      </div>

      <Confirm
        open={isConfirmEndOpen}
        title="Kết thúc trận đấu"
        description="Thí sinh sẽ không nộp đáp án được nữa và app thí sinh chuyển sang màn hình hoàn thành bài thi. Bạn có chắc chắn muốn kết thúc trận đấu?"
        onClose={() => setIsConfirmEndOpen(false)}
        onConfirm={handleEndExam}
      />

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ControlsOnline;

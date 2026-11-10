import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";

import z from "zod";

const TimerUpdateData = z.object({
  match: z.string(),
  newTime: z.number().optional(),
});
export type TimerUpdateData = z.infer<typeof TimerUpdateData>;

type TimerStatus = "running" | "paused";

interface MatchTimer {
  timeRemaining: number;
  intervalId: NodeJS.Timeout | null;
  status: TimerStatus;
}

export const matchTimers = new Map<string, MatchTimer>();

// Thời điểm đồng hồ của mỗi trận (theo slug) về 0, dùng để giới hạn thời gian
// nhận đáp án nộp tự động lúc hết giờ.
export const timerEndedAt = new Map<string, number>();

export const registerTimerEvents = (io: Server, socket: Socket) => {
  const getRoomName = (match: string) => `match-${match}`;

  socket.on("timer:play", async (data: unknown, callback) => {
    try {
      const validation = TimerUpdateData.safeParse(data);
      if (!validation.success) {
        return callback({ success: false, message: "Dữ liệu không hợp lệ" });
      }

      const payload = validation.data;
      const roomName = getRoomName(payload.match);

      const matchInfo = await MatchService.MatchControl(payload.match);
      if (!matchInfo) {
        return callback({ success: false, message: "Không tìm thấy trận đấu" });
      }

      const defaultTime = matchInfo.remainingTime ?? 30;

      let matchTimer = matchTimers.get(payload.match);

      if (!matchTimer) {
        matchTimer = {
          timeRemaining: defaultTime,
          intervalId: null,
          status: "paused",
        };
        matchTimers.set(payload.match, matchTimer);
      } else if (matchTimer.status === "running") {
        return callback({
          success: false,
          message: "Bộ đếm thời gian đang chạy",
        });
      } else {
        // Nếu đã có timer nhưng đổi câu → cập nhật thời gian mới từ DB
        matchTimer.timeRemaining = defaultTime;
      }

      matchTimer.status = "running";
      timerEndedAt.delete(payload.match);

      matchTimer.intervalId = setInterval(async () => {
        if (matchTimer!.timeRemaining > 0) {
          matchTimer!.timeRemaining -= 1;

          try {
            await MatchService.UpdateMatchBySlug(
              payload.match,
              matchTimer!.timeRemaining
            );
          } catch (error) {
            return callback?.({
              success: false,
              message: "Cập nhật thời gian thất bại",
            });
          }

          io.of("/match-control").to(roomName).emit("timer:update", {
            timeRemaining: matchTimer!.timeRemaining,
            isActive: true,
            isPaused: false,
          });

          // Log số lượng client trong room student
          const studentNamespace = io.of("/student");
          const room = studentNamespace.adapter.rooms.get(roomName);
          const clientCount = room ? room.size : 0;

          io.of("/student").to(roomName).emit("timer:update", {
            timeRemaining: matchTimer!.timeRemaining,
            isActive: true,
            isPaused: false,
          });
        } else {
          clearInterval(matchTimer!.intervalId!);
          matchTimer!.intervalId = null;
          matchTimer!.status = "paused";
          timerEndedAt.set(payload.match, Date.now());

          io.of("/match-control").to(roomName).emit("timer:ended");
          io.of("/student").to(roomName).emit("timer:ended");

          callback?.(null, {
            success: true,
            message: "Bộ đếm thời gian đã kết thúc",
          });
        }
      }, 1000);

      callback?.(null, {
        success: true,
        message: "Bắt đầu đếm thời gian",
      });
    } catch (err) {
      console.error("timer:play error", err);
      callback?.({
        success: false,
        message: "Có lỗi xảy ra khi bắt đầu đếm thời gian",
      });
    }
  });

  socket.on("timer:pause", async (data: unknown, callback) => {
    try {
      const validation = TimerUpdateData.safeParse(data);
      if (!validation.success) {
        return callback({ success: false, message: "Dữ liệu không hợp lệ" });
      }

      const { match } = validation.data;
      const roomName = getRoomName(match);
      const matchTimer = matchTimers.get(match);

      if (!matchTimer) {
        return callback({
          success: false,
          message: "Không tìm thấy bộ đếm thời gian",
        });
      }

      clearInterval(matchTimer.intervalId!);
      matchTimer.intervalId = null;
      matchTimer.status = "paused";

      await MatchService.UpdateMatchBySlug(match, matchTimer.timeRemaining);

      io.of("/match-control").to(roomName).emit("timer:update", {
        timeRemaining: matchTimer.timeRemaining,
        isActive: false,
        isPaused: true,
      });

      io.of("/student").to(roomName).emit("timer:update", {
        timeRemaining: matchTimer.timeRemaining,
        isActive: false,
        isPaused: true,
      });

      callback?.(null, {
        success: true,
        message: "Tạm dừng bộ đếm thời gian thành công",
      });
    } catch (err) {
      console.error("timer:pause error", err);
      callback?.({
        success: false,
        message: "Có lỗi xảy ra khi tạm dừng bộ đếm",
      });
    }
  });

  socket.on("timer:reset", async (data: unknown, callback) => {
    try {
      const validation = TimerUpdateData.safeParse(data);
      if (!validation.success) {
        return callback({
          success: false,
          message: "Dữ liệu không hợp lệ",
        });
      }

      const { match } = validation.data;
      const roomName = getRoomName(match);
      const matchInfo = await MatchService.MatchControl(match);

      if (!matchInfo) {
        return callback({
          success: false,
          message: "Không tìm thấy trận đấu",
        });
      }

      const currentQuestion = await MatchService.CurrentQuestion(
        matchInfo.currentQuestion,
        matchInfo.questionPackageId
      );

      const defaultTime = currentQuestion?.defaultTime ?? 30;

      let matchTimer = matchTimers.get(match);
      if (!matchTimer) {
        matchTimer = {
          timeRemaining: defaultTime,
          intervalId: null,
          status: "paused",
        };
        matchTimers.set(match, matchTimer);
      } else {
        clearInterval(matchTimer.intervalId!);
        matchTimer.intervalId = null;
        matchTimer.status = "paused";
        matchTimer.timeRemaining = defaultTime;
      }

      await MatchService.UpdateMatchBySlug(match, matchTimer.timeRemaining);

      io.of("/match-control").to(roomName).emit("timer:update", {
        timeRemaining: matchTimer.timeRemaining,
        isActive: false,
        isPaused: false,
      });

      io.of("/student").to(roomName).emit("timer:update", {
        timeRemaining: matchTimer.timeRemaining,
        isActive: false,
        isPaused: false,
      });

      callback?.(null, {
        success: true,
        message: "Reset thời gian thành công",
      });
    } catch (err) {
      console.error("timer:reset error", err);
      callback?.({
        success: false,
        message: "Có lỗi xảy ra khi reset thời gian",
      });
    }
  });

  socket.on("timer:update", async (data: unknown, callback) => {
    try {
      const validation = TimerUpdateData.safeParse(data);
      if (!validation.success) {
        return callback({
          success: false,
          message: "Dữ liệu không hợp lệ",
        });
      }

      const { match, newTime } = validation.data;
      const roomName = getRoomName(match);
      const matchInfo = await MatchService.MatchControl(match);

      if (!matchInfo) {
        return callback({ success: false, message: "Không tìm thấy trận đấu" });
      }

      const defaultTime = Number(newTime) ?? 30;

      let matchTimer = matchTimers.get(match);
      if (!matchTimer) {
        matchTimer = {
          timeRemaining: defaultTime,
          intervalId: null,
          status: "paused",
        };
        matchTimers.set(match, matchTimer);
      } else {
        clearInterval(matchTimer.intervalId!);
        matchTimer.intervalId = null;
        matchTimer.status = "paused";
        matchTimer.timeRemaining = defaultTime;
      }

      await MatchService.UpdateMatchBySlug(match, matchTimer.timeRemaining);

      io.of("/match-control").to(roomName).emit("timer:update", {
        timeRemaining: matchTimer.timeRemaining,
        isActive: false,
        isPaused: false,
      });

      io.of("/student").to(roomName).emit("timer:update", {
        timeRemaining: matchTimer.timeRemaining,
        isActive: false,
        isPaused: false,
      });

      callback?.(null, {
        success: true,
        message: "Cập nhật thời gian thành công",
      });
    } catch (err) {
      callback?.({
        success: false,
        message: "Có lỗi xảy ra khi cập nhật thời gian",
      });
    }
  });
};

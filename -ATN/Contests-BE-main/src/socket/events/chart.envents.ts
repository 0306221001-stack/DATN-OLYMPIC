// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";
import { ScreenService, UpdateScreenInput } from "@/modules/screen";
import { ControlKey, ControlValue } from "@prisma/client";
import { ResultService } from "@/modules/result";
import { z } from "zod";

export const updatestatistics = z.object({
  match: z.string(),
});

export type UpdateStatisticsData = z.infer<typeof updatestatistics>;

export const registerStatisticsEvents = (io: Server, socket: Socket) => {
  socket.on("statistics:update", async (data, callback) => {
    const validation = updatestatistics.safeParse(data);
    if (!validation.success) {
      return callback({ success: false, message: "Dữ liệu không hợp lệ" });
    }

    const payload = validation.data;

    const matchRaw = await MatchService.MatchControl(payload.match);
    if (!matchRaw) {
      return callback({ success: false, message: "Không tìm thấy trận đấu" });
    }

    const screen = await MatchService.ScreenControl(matchRaw.id);
    if (!screen) {
      return callback({
        success: false,
        message: "Cập nhật màn hình thất bại",
      });
    }

    const roomName = `match-${payload.match}`;

    const updatePayload: UpdateScreenInput = {
      controlKey: "statistic",
    };

    const updatedScreen = await ScreenService.update(screen.id, updatePayload);
    if (!updatedScreen) {
      return callback({
        success: false,
        message: "Cập nhật màn hình thất bại",
      });
    }

    const statisticRaw = await ResultService.statisticals(matchRaw.id);

    const statistics = statisticRaw.map(stat => ({
      label: stat.questionOrder,
      value: stat._count.isCorrect,
    }));

    callback(null, {
      message: "Cập nhật màn hình thành công",
    });

    io.of("/match-control").to(roomName).emit("statistics:update", {
      updatedScreen,
      statistics,
    });
  });
  socket.on("statisticsContestant:update", async (data, callback) => {
    const validation = updatestatistics.safeParse(data);
    if (!validation.success) {
      return callback({ success: false, message: "Dữ liệu không hợp lệ" });
    }

    const payload = validation.data;

    const matchRaw = await MatchService.MatchControl(payload.match);
    if (!matchRaw) {
      return callback({ success: false, message: "Không tìm thấy trận đấu" });
    }

    const screen = await MatchService.ScreenControl(matchRaw.id);
    if (!screen) {
      return callback({
        success: false,
        message: "Cập nhật màn hình thất bại",
      });
    }

    const roomName = `match-${payload.match}`;

    const updatePayload: UpdateScreenInput = {
      controlKey: "chartContestant",
    };

    const updatedScreen = await ScreenService.update(screen.id, updatePayload);
    if (!updatedScreen) {
      return callback({
        success: false,
        message: "Cập nhật màn hình thất bại",
      });
    }

    const statisticRaw = await ResultService.chartContestant(matchRaw.id);

    const statisticsContestant = statisticRaw.map(stat => ({
      label: stat.registrationNumber,
      value: stat.correctCount,
    }));

    callback(null, {
      message: "Cập nhật màn hình thành công",
    });

    io.of("/match-control").to(roomName).emit("statisticsContestant:update", {
      updatedScreen,
      statisticsContestant,
    });
  });
};

// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";
import { RescueService } from "@/modules/rescues";
import { ScreenService, UpdateScreenInput } from "@/modules/screen";
import { ControlKey, ControlValue } from "@prisma/client";
import { z } from "zod";

export const ShowQrRecuse = z.object({
  controlKey: z.nativeEnum(ControlKey).optional(),
  controlValue: z.nativeEnum(ControlValue).optional(),
  media: z.string().optional(),
  match: z.string(),
  value: z.string().optional(),
  questionOrder: z.number(),
  rescueId: z.number().int(),
});

export const ShowQrChart = z.object({
  controlKey: z.nativeEnum(ControlKey).optional(),
  controlValue: z.nativeEnum(ControlValue).optional(),
  media: z.string().optional(),
  match: z.string(),
  value: z.string().optional(),
  rescueId: z.number().int(),
});

export const timerLeftSchema = z.object({
  match: z.string(),
  timerLeft: z.number(),
  rescuedId: z.number().int(),
  matchId: z.number().int(),
});

export type ShowQrRecuseData = z.infer<typeof ShowQrRecuse>;

export const registerAudienceEvents = (io: Server, socket: Socket) => {
  socket.on("showQrRescue", async (data, callback) => {
    const validation = ShowQrRecuse.safeParse(data);
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

    const rescue = await RescueService.getRescueBy({
      id: payload.rescueId,
      matchId: matchRaw.id,
    });

    if (!rescue) {
      return callback({
        success: false,
        message: "Không tìm thấy cứu trợ",
      });
    }

    const updateRescued = await RescueService.updateRescue(rescue.id, {
      questionOrder: payload.questionOrder,
    });

    if (!updateRescued) {
      return callback({
        success: false,
        message: "Cập nhật cứu trợ thất bại",
      });
    }

    const updatePayload: UpdateScreenInput = {
      media: payload.media,
      controlKey: payload.controlKey,
      controlValue: payload.controlValue,
      value: payload.value,
    };

    const updatedScreen = await ScreenService.update(screen.id, updatePayload);
    if (!updatedScreen) {
      return callback({
        success: false,
        message: "Cập nhật màn hình thất bại",
      });
    }

    const LisstRescue = await RescueService.getListRescue(matchRaw.id);

    callback(null, {
      message: "Hiển thị QR cứu trợ thành công",
    });
    const roomName = `match-${payload.match}`;
    io.of("/match-control").to(roomName).emit("showQrRescue", {
      updatedScreen,
      LisstRescue,
    });
  });

  socket.on("showQrChart", async (data, callback) => {
    const validation = ShowQrChart.safeParse(data);
    if (!validation.success) {
      return callback({
        success: false,
        message: "Dữ liệu không hợp lệ",
      });
    }

    const payload = validation.data;
    const matchRaw = await MatchService.MatchControl(payload.match);
    if (!matchRaw) {
      return callback({
        success: false,
        message: "Không tìm thấy trận đấu",
      });
    }

    const rescuse = await RescueService.updateRescue(payload.rescueId, {
      status: "used",
    });

    if (!rescuse) {
      return callback(null, {
        success: false,
        message: "Cập nhật cứu trợ thất bại",
      });
    }

    // Lọc supportAnswers chỉ lấy string hợp lệ
    const supportAnswers = Array.isArray(rescuse.supportAnswers)
      ? rescuse.supportAnswers.filter(
          (item): item is string => typeof item === "string"
        )
      : [];

    console.log(typeof (supportAnswers.length === 0));
    if (supportAnswers.length === 0) {
      console.log("Không có câu trả lời hỗ trợ nào cho cứu trợ này");
      return callback({
        success: false,
        message: "Không có câu trả lời hỗ trợ nào cho cứu trợ này",
      });
    }

    const screen = await MatchService.ScreenControl(matchRaw.id);
    if (!screen) {
      return callback(null, {
        success: false,
        message: "Cập nhật màn hình thất bại",
      });
    }

    const updatePayload: UpdateScreenInput = {
      media: payload.media,
      controlKey: payload.controlKey,
      controlValue: payload.controlValue,
      value: payload.value,
    };

    const updatedScreen = await ScreenService.update(screen.id, updatePayload);
    if (!updatedScreen) {
      return callback({
        success: false,
        message: "Cập nhật màn hình thất bại",
      });
    }

    const ListRescue = await RescueService.getListRescue(matchRaw.id);

    const chartData = Object.entries(
      supportAnswers.reduce((acc: Record<string, number>, curr: string) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    callback(null, {
      success: true,
      message: "Hiển thị biểu đồ thành công",
    });

    const roomName = `match-${payload.match}`;
    io.of("/match-control").to(roomName).emit("showQrChart", {
      updatedScreen,
      chartData,
      ListRescue,
    });
  });

  const rescueTimers = new Map(); // Lưu các timer theo rescuedId

  socket.on("timerLeft:Rescue", async (data, callback) => {
    console.log("timerLeft:Rescue", data);
    const validation = timerLeftSchema.safeParse(data);
    if (!validation.success) {
      return callback({
        success: false,
        message: "Dữ liệu không hợp lệ",
      });
    }

    const payload = validation.data;
    const roomName = `match-${payload.match}`;

    if (!Number(payload.timerLeft) || payload.timerLeft < 0) {
      return callback({
        success: false,
        message: "Thời gian còn lại không hợp lệ",
      });
    }

    if (rescueTimers.has(payload.rescuedId)) {
      clearInterval(rescueTimers.get(payload.rescuedId));
    }

    await RescueService.updateRescue(payload.rescuedId, {
      status: "proposed",
    });

    let timerLeft = payload.timerLeft;

    const interval = setInterval(async () => {
      timerLeft -= 1;

      if (timerLeft <= 0) {
        clearInterval(interval);
        rescueTimers.delete(payload.rescuedId); // Xoá khỏi Map
        timerLeft = 0;

        await RescueService.updateRescue(payload.rescuedId, {
          status: "used",
        });

        const ListRescue = await RescueService.getListRescue(payload.matchId);
        io.of("/match-control").to(roomName).emit("timerEnd:Rescue", {
          timerLeft,
          ListRescue,
        });
      }

      io.of("/match-control").to(roomName).emit("timerLeft:Rescue", {
        timerLeft,
        match: payload.match,
      });
    }, 1000);

    rescueTimers.set(payload.rescuedId, interval);

    const ListRescue = await RescueService.getListRescue(payload.matchId);
    io.of("/match-control").to(roomName).emit("timerStart:Rescue", {
      ListRescue,
    });

    callback(null, {
      success: true,
      message: "Cập nhật thời gian còn lại thành công",
    });
  });
};

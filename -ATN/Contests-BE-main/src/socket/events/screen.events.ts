// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";
import { ScreenService, UpdateScreenInput } from "@/modules/screen";
import { ControlKey, ControlValue } from "@prisma/client";
import { z } from "zod";

export const updateScreen = z.object({
  controlKey: z.nativeEnum(ControlKey).optional(),
  controlValue: z.nativeEnum(ControlValue).optional(),
  media: z.string().optional(),
  match: z.string(),
  value: z.string().optional(),
});

export type UpdateScreenData = z.infer<typeof updateScreen>;

export const registerScreenEvents = (io: Server, socket: Socket) => {
  socket.on("screen:update", async (data, callback) => {
    const validation = updateScreen.safeParse(data);
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

    callback(null, {
      message: "Cập nhật màn hình thành công",
    });

    // Hiện sơ đồ: gửi kèm trạng thái thí sinh mới nhất để màn chiếu cập nhật
    // ngay (thí sinh bị loại/bị cấm khi trả lời không phát sự kiện riêng).
    if (payload.controlKey === "matchDiagram") {
      const [ListContestant, countInProgress] = await Promise.all([
        MatchService.ListContestant(matchRaw.id),
        MatchService.countIn_progress(matchRaw.id),
      ]);
      io.of("/match-control").to(roomName).emit("screen:update", {
        updatedScreen,
        ListContestant,
        countInProgress,
      });
      return;
    }

    io.of("/match-control").to(roomName).emit("screen:update", {
      updatedScreen,
    });
  });
};

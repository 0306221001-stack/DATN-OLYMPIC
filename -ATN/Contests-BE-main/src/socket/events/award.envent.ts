// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";
import { GroupDivisionService } from "@/modules/groupDivision";
import { AwardService } from "@/modules/award";

import { StudentService } from "@/modules/student";

import { number, z } from "zod";

export const updateWinGold = z.object({
  match: z.string(),
  registrationNumber: number(),
});
export const UpdateAward = z.object({
  match: z.string(),
  contestantId: number(),
  awardId: number(),
});

export type UpdateWinGoldData = z.infer<typeof updateWinGold>;
export type UpdateAwardData = z.infer<typeof UpdateAward>;

export const registerAwardEvents = (io: Server, socket: Socket) => {
  socket.on("update:winGold", async (rawData: unknown, callback) => {
    const validation = updateWinGold.safeParse(rawData);
    if (!validation.success) {
      return callback({
        success: false,
        message: "Dữ liệu không hợp lệ",
      });
    }

    const payload = validation.data;

    try {
      const match = await MatchService.MatchControl(payload.match);
      if (!match) {
        return callback({
          success: false,
          message: "Không tìm thấy trận đấu",
        });
      }

      const studentId = await StudentService.getStudentIdByMatchId(
        match.id,
        payload.registrationNumber
      );

      if (!studentId) {
        return callback({
          success: false,
          message: "Không tìm thấy thí sinh",
        });
      }

      const updateWinGold = await MatchService.update(match.id, {
        studentId: studentId,
      });

      if (!updateWinGold) {
        return callback({
          success: false,
          message: "Cập nhật thí sinh thất bại",
        });
      }

      await GroupDivisionService.UpdateStatusGold(
        match.id,
        payload.registrationNumber
      );

      const ListContestant = await MatchService.ListContestant(match.id);

      const matchInfo = await MatchService.MatchControl(payload.match);

      const roomName = `match-${payload.match}`;
      io.of("/match-control").to(roomName).emit("contestant:status-update", {
        ListContestant,
      });
      io.of("/match-control")
        .to(roomName)
        .emit("update:winGold", { matchInfo });

      callback(null, {
        message: "Cập nhật thí sinh gold thành công",
        success: true,
      });
    } catch (error) {
      console.error("Lỗi khi xử lý cập nhật trạng thái:", error);
      callback(new Error("Đã xảy ra lỗi nội bộ"));
    }
  });

  socket.on("update:award", async (rawData: unknown, callback) => {
    const validation = UpdateAward.safeParse(rawData);
    if (!validation.success) {
      return callback({
        success: false,
        message: "Dữ liệu không hợp lệ",
      });
    }

    const payload = validation.data;
    try {
      const match = await MatchService.MatchControl(payload.match);
      if (!match) {
        return callback({
          success: false,
          message: "Không tìm thấy trận đấu",
        });
      }

      const updateAward = await AwardService.updateAwardContestant(
        payload.awardId,
        payload.contestantId
      );

      if (!updateAward) {
        return callback({
          success: false,
          message: "Không tìm thấy thí sinh",
        });
      }

      const firstPrize = await AwardService.getAwardByType(
        "firstPrize",
        match.id
      );

      const secondPrize = await AwardService.getAwardByType(
        "secondPrize",
        match.id
      );

      const thirdPrize = await AwardService.getAwardByType(
        "thirdPrize",
        match.id
      );

      const roomName = `match-${payload.match}`;
      io.of("/match-control").to(roomName).emit("update:award", {
        firstPrize,
        secondPrize,
        thirdPrize,
      });

      callback(null, {
        message: "Cập nhật giải thưởng thành công",
        success: true,
      });
    } catch (error) {
      console.error("Lỗi khi xử lý cập nhật trạng thái:", error);
      callback(new Error("Đã xảy ra lỗi nội bộ"));
    }
  });
};

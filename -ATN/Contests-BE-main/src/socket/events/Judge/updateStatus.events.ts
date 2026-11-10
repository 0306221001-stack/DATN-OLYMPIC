// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";
import { GroupService } from "@/modules/group";

import { GroupDivisionService } from "@/modules/groupDivision";

import { z } from "zod";

export const statusUpdateSchema = z.object({
  match: z.string(),
  userId: z.number().int(),
  status: z.enum(["not_started", "in_progress", "confirmed1", "confirmed2"]),
  ids: z.array(z.number().int().nonnegative()),
});

export const confirmCurrentQuestion = z.object({
  match: z.string(),
  userId: z.number().int(),
  groupId: z.number().int(),
  confirmCurrentQuestion: z.number(),
});

export type StatusUpdateData = z.infer<typeof statusUpdateSchema>;

export const registerUpdateStatusByJudgeEvents = (
  io: Server,
  socket: Socket
) => {
  socket.on(
    "contestant:status-update-judge",
    async (rawData: unknown, callback) => {
      console.log("Payload:", rawData);
      const validation = statusUpdateSchema.safeParse(rawData);
      if (!validation.success) {
        return callback({ success: false, message: "Dữ liệu không hợp lệ" });
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

        const updatedContestant =
          await GroupDivisionService.UpdateContestantMatchStatus(
            match.id,
            payload.status,
            payload.ids
          );

        if (!updatedContestant) {
          return callback({
            success: false,
            message: "Cập nhật trạng thái không thành công",
          });
        }

        const ListContestant = await MatchService.ListContestant(match.id);
        if (!ListContestant) {
          return callback({
            success: false,
            message: "Không tìm thấy danh sách thí sinh",
          });
        }

        const data =
          await GroupDivisionService.getContestantByJudgeIdAndMatchId(
            payload.userId,
            match.id
          );

        if (!data) {
          return callback({
            success: false,
            message: "Không tìm thấy thí sinh",
          });
        }

        const roomName = `match-${payload.match}`;
        io.of("/match-control").to(roomName).emit("contestant:status-update", {
          ListContestant,
        });

        const judgeRoom = `match-${payload.match}-judge-${payload.userId}`;

        io.of("/match-control")
          .to(judgeRoom)
          .emit("contestant:status-update-judge", {
            data,
          });

        callback(null, {
          message: "Cập nhật trạng thái thành công",
          success: true,
        });
      } catch (error) {
        console.error("Lỗi khi xử lý cập nhật trạng thái:", error);
        callback(new Error("Đã xảy ra lỗi nội bộ"));
      }
    }
  );

  socket.on(
    "group:confirmCurrentQuestion-update",
    async (rawData: unknown, callback) => {
      const validation = confirmCurrentQuestion.safeParse(rawData);
      if (!validation.success) {
        return callback(new Error("Dữ liệu không hợp lệ"));
      }

      const payload = validation.data;

      try {
        const match = await MatchService.MatchControl(payload.match);
        if (!match) {
          return callback(new Error("Không tìm thấy trận đấu"));
        }

        const updatedGroup = await GroupService.update(payload.groupId, {
          confirmCurrentQuestion: payload.confirmCurrentQuestion,
        });

        if (!updatedGroup) {
          return callback(new Error("Cập nhật xác nhận không thành công"));
        }

        const ListContestant = await MatchService.ListContestant(match.id);
        if (!ListContestant) {
          return callback(new Error("Không tìm thấy danh sách thí sinh"));
        }

        const roomName = `match-${payload.match}`;
        io.of("/match-control").to(roomName).emit("contestant:status-update", {
          ListContestant,
        });

        const judgeRoom = `match-${payload.match}-judge-${payload.userId}`;

        io.of("/match-control")
          .to(judgeRoom)
          .emit("group:confirmCurrentQuestion-update", {
            updatedGroup,
          });

        callback(null, {
          message: "Cập nhật trạng thái thành công",
          success: true,
        });
      } catch (error) {
        console.error("Lỗi khi xử lý cập nhật trạng thái:", error);
        callback(new Error("Đã xảy ra lỗi nội bộ"));
      }
    }
  );
};

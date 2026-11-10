// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";

import { UserService } from "@/modules/user";

import { GroupDivisionService } from "@/modules/groupDivision";
import { prisma } from "@/config/database";
import { notifyStudentsRescued } from "../../services/studentRescued";
import {
  getAdvanceGuard,
  getIneligibleAdvanceMessage,
} from "@/modules/contestant/advanceGuard";

import { z } from "zod";

export const statusUpdateSchema = z.object({
  match: z.string(),
  status: z.enum([
    "not_started",
    "in_progress",
    "confirmed1",
    "confirmed2",
    "eliminated",
    "rescued",
    "banned",
    "completed",
  ]),
  ids: z.array(z.number().int().nonnegative()),
});

export type StatusUpdateData = z.infer<typeof statusUpdateSchema>;

export const registerUpdateStatusByAdminEvents = (
  io: Server,
  socket: Socket
) => {
  socket.on(
    "contestant:status-update-admin",
    async (rawData: unknown, callback) => {
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

        // Cứu trợ trước, qua vòng sau (xem advanceGuard).
        if (payload.status === "completed") {
          const guard = await getAdvanceGuard(match.id);
          if (guard.blocked) {
            return callback({ success: false, message: guard.message });
          }
          const ineligible = await getIneligibleAdvanceMessage(match.id, {
            registrationNumbers: payload.ids,
          });
          if (ineligible) {
            return callback({ success: false, message: ineligible });
          }
        }

        const updatedContestant =
          await GroupDivisionService.UpdateContestantMatchStatus(
            match.id,
            payload.status,
            payload.ids,
            match.currentQuestion
          );

        if (!updatedContestant) {
          return callback({
            success: false,
            message: "Cập nhật trạng thái thí sinh thất bại",
          });
        }

        const ListContestant = await MatchService.ListContestant(match.id);
        if (!ListContestant) {
          return callback({
            success: false,
            message: "Không tìm thấy danh sách thí sinh",
          });
        }

        callback(null, {
          message: "Cập nhật trạng thái thành công",
          success: true,
        });

        const roomName = `match-${payload.match}`;
        io.of("/match-control").to(roomName).emit("contestant:status-update", {
          ListContestant,
        });

        if (payload.status === "rescued" && payload.ids.length > 0) {
          // `payload.ids` là số báo danh trong trận.
          const rescued = await prisma.contestantMatch.findMany({
            where: { matchId: match.id, registrationNumber: { in: payload.ids } },
            select: { contestantId: true, registrationNumber: true },
          });
          notifyStudentsRescued(io, match, rescued);
        }

        const judges = await UserService.ListJudgeByMatchId(match.id);
        if (judges) {
          judges.forEach(async judge => {
            const judgeRoom = `match-${payload.match}-judge-${judge.id}`;
            const data =
              await GroupDivisionService.getContestantByJudgeIdAndMatchId(
                judge.id,
                match.id
              );
            io.of("/match-control")
              .to(judgeRoom)
              .emit("contestant:status-update-judge", {
                data,
              });
          });
        }
        if (!judges) {
          return callback({
            success: false,
            message: "Không tìm thấy danh sách giám khảo",
          });
        }

        callback(null, {
          message: "Cập nhật trạng thái thành công",
          success: true,
        });
      } catch (error) {
        callback({ success: false, message: "Đã xảy ra lỗi nội bộ" });
      }
    }
  );
};

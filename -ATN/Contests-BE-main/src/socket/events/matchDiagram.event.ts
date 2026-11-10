// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import { MatchService } from "@/modules/match";
import { GroupDivisionService } from "@/modules/groupDivision";
import { ResultService } from "@/modules/result";
import { ScreenService } from "@/modules/screen";
import { RescueService } from "@/modules/rescues";
import { notifyStudentsRescued } from "../services/studentRescued";

import { z } from "zod";
import { UserService } from "@/modules/user";

export const updateEliminated = z.object({
  match: z.string(),
  questionOrder: z.number(),
});

export const updateRescued = z.object({
  match: z.string(),
});

export type UpdateEliminatedData = z.infer<typeof updateEliminated>;
export type UpdateRescuedData = z.infer<typeof updateRescued>;

export const registerMatchDiagramEvents = (io: Server, socket: Socket) => {
  socket.on("update:Eliminated", async (rawData: unknown, callback) => {
    const validation = updateEliminated.safeParse(rawData);
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

      const deletedResult = await ResultService.deleted(
        match.id,
        payload.questionOrder
      );

      if (!deletedResult) {
        return callback({
          success: false,
          message: "Xoá kết quả thất bại",
        });
      }

      const UpdateEliminated =
        await GroupDivisionService.UpdateContestantStatusEliminated(
          match.id,
          payload.questionOrder
        );
      if (!UpdateEliminated) {
        return callback({
          success: false,
          message: "Cập nhật thí sinh loại thất bại",
        });
      }

      const in_progress = await GroupDivisionService.getContestantMatchByStatus(
        match.id,
        "in_progress"
      );

      const payloadInProgress = in_progress.map(c => c.contestantId);

      if (!in_progress) {
        return callback({
          success: false,
          message: "Không tìm thấy thí sinh đang thi",
        });
      }

      const resultTrue = await ResultService.createIsCorrectTrues(
        match.id,
        payload.questionOrder,
        payloadInProgress
      );

      if (!resultTrue) {
        return callback({
          success: false,
          message: "Cập nhật kết quả thí sinh đúng thất bại",
        });
      }

      const eliminatedRaw =
        await GroupDivisionService.getContestantMatchByStatus(
          match.id,
          "eliminated",
          payload.questionOrder
        );

      if (!eliminatedRaw) {
        return callback({
          success: false,
          message: "Không tìm thấy thí sinh bị loại",
        });
      }

      const eliminated = eliminatedRaw.map(c => c.contestantId);

      const resultFalse = await ResultService.createIsCorrectFalses(
        match.id,
        payload.questionOrder,
        eliminated
      );

      if (!resultFalse) {
        return callback({
          success: false,
          message: "Cập nhật kết quả thí sinh sai thất bại",
        });
      }

      const ListContestant = await MatchService.ListContestant(match.id);

      if (!ListContestant) {
        return callback({
          success: false,
          message: "Không tìm thấy thí sinh",
        });
      }

      const countInProgress = await MatchService.countIn_progress(match.id);

      const screen = await MatchService.ScreenControl(match.id);

      if (!screen)
        return callback({
          success: false,
          message: "Không tìm thấy màn hình",
        });

      const updatedScreen = await ScreenService.update(screen.id, {
        controlValue: "Eliminated",
      });

      if (!updatedScreen) {
        return callback({
          success: false,
          message: "Cập nhật màn hình không thành công",
        });
      }

      const roomName = `match-${payload.match}`;
      io.of("/match-control").to(roomName).emit("update:Eliminated", {
        ListContestant,
        countInProgress,
        updatedScreen,
      });

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
        message: "Hiển thị thí sinh loại thành công",
        success: true,
      });

      const result = await RescueService.updateRescueStatusByCurrentQuestion(
        Number(match.id),
        Number(payload.questionOrder)
      );

      if (!result) {
        return callback({
          success: false,
          message: "Cập nhật trạng thái rescue thất bại",
        });
      }

      io.of("/match-control").to(roomName).emit("rescue:statusUpdated", {
        success: true,
        data: result,
      });
      const ListRescue = await RescueService.getListRescue(match.id);

      io.of("/match-control").to(roomName).emit("rescue:updateStatus", {
        ListRescue,
      });

      const statistics = await ResultService.chartContestant(match?.id);

      if (!statistics) {
        callback({
          success: false,
          message: "Không tìm thấy thống kê cho trận đấu này",
        });
        return;
      }

      const data = statistics.map(stat => ({
        label: stat.registrationNumber,
        value: stat.correctCount,
        fullName: stat.fullName,
        contestantId: stat.contestantId,
      }));

      io.of("/match-control").to(roomName).emit("listResult", {
        data,
      });
    } catch (error) {
      console.error("Lỗi khi xử lý cập nhật trạng thái:", error);
      callback(new Error("Đã xảy ra lỗi nội bộ"));
    }
  });

  socket.on("update:Rescued", async (rawData: unknown, callback) => {
    const validation = updateRescued.safeParse(rawData);
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

      const screen = await MatchService.ScreenControl(match.id);

      if (!screen) {
        return callback({
          success: false,
          message: "Không tìm thấy màn hình",
        });
      }

      const updateScreen = await ScreenService.update(screen.id, {
        controlValue: "Rescued",
      });
      if (!updateScreen) {
        return callback({
          success: false,
          message: "Cập nhật màn hình không thành công",
        });
      }

      const ListContestant = await MatchService.ListContestant(match.id);
      if (!ListContestant) {
        return callback({
          success: false,
          message: "Không tìm thấy thí sinh",
        });
      }

      const countInProgress = await MatchService.countIn_progress(match.id);

      const rescued = await GroupDivisionService.getIdsByStatus(match.id);
      notifyStudentsRescued(io, match, rescued);

      const roomName = `match-${payload.match}`;
      io.of("/match-control").to(roomName).emit("update:Rescued", {
        ListContestant,
        countInProgress,
        updateScreen,
      });
      callback(null, {
        message: "Hiển thị thí sinh cứu thành công",
        success: true,
      });
    } catch (error) {
      console.error("Lỗi khi tìm trận đấu:", error);
      return callback({
        success: false,
        message: "Đã xảy ra lỗi nội bộ",
      });
    }
  });
};

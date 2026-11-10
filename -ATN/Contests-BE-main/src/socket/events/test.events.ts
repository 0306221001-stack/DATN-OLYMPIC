// src/socket/events/question.events.ts
import { Server, Socket } from "socket.io";
import prisma from "@/config/client";
export type test = {
  matchId: number;
  role: string;
};

export const registerTestEvents = (io: Server, socket: Socket) => {
  socket.on("sendToMatch", async ({ matchId, message }) => {
    const room = `match-${matchId}`;

    // 👇 Đặt await để lấy dữ liệu thật
    const contest = await prisma.contest.findFirst();

    io.of("/match-control").to(room).emit("receiveMessage", {
      contest,
    });
  });
};

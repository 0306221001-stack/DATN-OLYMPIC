import { Server, Socket } from "socket.io";
import { logger } from "@/utils/logger";
import { verifyToken, JwtPayload } from "@/utils/jwt";
import { registerStudentEvents } from "../events/student.events";
import { prisma } from "@/config/database";
import cookie from "cookie";
import { findCurrentContestantId } from "@/utils/currentContestant";

// Interface cho authenticated socket
interface AuthenticatedSocket extends Socket {
  user: {
    userId: number;
    username: string;
    email: string;
    role: string;
  };
  contestantId?: number;
  matchId?: number;
}

// Extract user từ socket cookie và lấy thông tin contestant
const extractUserAndContestantFromSocket = async (
  socket: Socket
): Promise<{ user: JwtPayload; contestantId?: number } | null> => {
  try {
    const rawCookie = socket.handshake.headers.cookie;

    if (!rawCookie) {
      return null;
    }

    const parsed = cookie.parse(rawCookie);
    const token = parsed.accessToken;

    if (!token) {
      return null;
    }


    const payload = verifyToken(token) as JwtPayload;

    if (!payload) {
      return null;
    }



    // Nếu là Student, tìm contestant
    if (payload.role === "Student") {


      const currentContestantId = await findCurrentContestantId(
        payload.userId
      );
      const contestant = await prisma.contestant.findFirst({
        where: { id: currentContestantId ?? -1 },
        include: {
          student: {
            select: { id: true, fullName: true, studentCode: true },
          },
        },
      });

      if (contestant) {

        return { user: payload, contestantId: contestant.id };
      } else {

        return { user: payload }; // Vẫn trả về user nhưng không có contestantId
      }
    }

    return { user: payload };
  } catch (error) {

    logger.error("Error extracting user from socket:", error);
    return null;
  }
};

// Register student namespace events
export const registerStudentNamespaceEvents = async (
  io: Server,
  socket: Socket
) => {

  const userInfo = await extractUserAndContestantFromSocket(socket);

  if (!userInfo) {
    logger.warn(`❌ Cannot authenticate socket: ${socket.id}`);
    socket.disconnect();
    return;
  }

  const { user, contestantId } = userInfo;



  // Chỉ cho phép user có role Student
  if (user.role !== "Student") {

    logger.warn(
      `❌ Non-student user attempted to connect to student namespace: ${socket.id}`
    );
    socket.disconnect();
    return;
  }

  // Gán user và contestant vào socket
  (socket as AuthenticatedSocket).user = user;
  (socket as AuthenticatedSocket).contestantId = contestantId;



  logger.info(
    `✅ Student connected to namespace: ${user.username} (${
      socket.id
    }) | ContestantId: ${contestantId || "none"}`
  );

  // Register all student events from student.events.ts
  const studentNamespace = io.of("/student");
  registerStudentEvents(studentNamespace, socket as AuthenticatedSocket);

  // Join match for answering nhận các event từ admin ( start, pause, nextQuestion, endMatch)
  socket.on(
    "student:joinMatch",
    (data: { matchSlug: string }, callback?: (response: any) => void) => {
      try {

        const { matchSlug } = data;

        // 🔥 FIX: Sử dụng slug trực tiếp làm room name để đồng bộ với admin
        const mainRoomName = `match-${matchSlug}`;
        socket.join(mainRoomName);

        // Log danh sách thí sinh trong phòng
        const room = studentNamespace.adapter.rooms.get(mainRoomName);
        const roomSize = room ? room.size : 0;
        const memberSocketIds = room ? Array.from(room) : [];

        for (const sid of memberSocketIds) {
          const s = studentNamespace.sockets.get(sid);
          if (s) {

          }
        }

        // Tham gia phòng trả lời riêng cho việc submit answers
        const answerRoomName = `match-${matchSlug}-answers`;
        socket.join(answerRoomName);





        if (callback) {
          const response = {
            success: true,
            message: `Joined match room ${mainRoomName}`,
            roomName: mainRoomName,
            matchSlug,
          };
          callback(response);
        }
      } catch (error) {

        logger.error(`Error joining rooms:`, error);
        if (callback) {
          callback({
            success: false,
            message: "Failed to join match rooms",
          });
        }
      }
    }
  );

  // Handle disconnect
  socket.on("disconnect", (reason) => {


    logger.info(
      `🔌 Student ${user.username} disconnected from namespace: ${reason}`
    );

    // Notify admin about student disconnect if they were in a match
    const matchId = (socket as AuthenticatedSocket).matchId;
    if (matchId) {

      socket.to(`match-${matchId}`).emit("student:disconnected", {
        studentId: user.userId,
        studentName: user.username,
        contestantId: contestantId,
        matchId: matchId,
        reason: reason,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // 🔥 NEW: Handle leave match room với matchSlug
  socket.on("leaveMatchRoom", (matchSlug: string) => {
    try {


      const mainRoomName = `match-${matchSlug}`;
      const answerRoomName = `match-${matchSlug}-answers`;

      socket.leave(mainRoomName);
      socket.leave(answerRoomName);
        // Log danh sách thí sinh trong phòng
        const room = studentNamespace.adapter.rooms.get(mainRoomName);
        const roomSize = room ? room.size : 0;
        const memberSocketIds = room ? Array.from(room) : [];

        for (const sid of memberSocketIds) {
          const s = studentNamespace.sockets.get(sid);
          if (s) {
          }
        }

    } catch (error) {

      logger.error(`Error leaving rooms:`, error);
    }
  });


};

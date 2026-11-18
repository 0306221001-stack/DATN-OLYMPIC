import { Server, Socket } from "socket.io";
import { logger } from "@/utils/logger";
import { verifyToken, JwtPayload } from "@/utils/jwt";
import { registerMatchControlEvents } from "./namespaces/matchControl.namespace";
import { registerStudentNamespaceEvents } from "./namespaces/student.namespace";
import { ExtendedError } from "socket.io/dist/namespace";
import { socketService } from "./SocketService";
import cookie from "cookie";
import { registerTestEvents } from "./events/test.events";
import { registerStudentEvents } from "./events/student.events";
import { registerMatchEvents } from "./events/match.events";
import { timerService } from "./services/timer.service";
import { prisma } from "@/config/database";
import { findCurrentContestantId } from "@/utils/currentContestant";

// Extend Socket interface to include user and contestant info
interface AuthenticatedSocket extends Socket {
  user: JwtPayload;
  contestantId?: number;
  matchId?: number;
}

/**
 * Middleware xác thực kết nối Socket.IO bằng JWT trong cookie httpOnly
 */
export const authMiddleware = async (
  socket: Socket,
  next: (err?: ExtendedError) => void
) => {
  try {
    const rawCookie = socket.handshake.headers.cookie;
    if (!rawCookie) {
      logger.warn(`❌ [BE] Không có cookie. Socket ID: ${socket.id}`);
      return next(new Error("Authentication error: No cookie"));
    }

    const token = cookie.parse(rawCookie).accessToken;
    if (!token) {
      logger.warn(`❌ [BE] Không tìm thấy accessToken trong cookie. Socket ID: ${socket.id}`);
      return next(new Error("Authentication error: Token not found"));
    }

    // Không ghi token (hay một phần token) vào log: ai đọc được log sẽ đăng nhập thay được.
    const payload = verifyToken(token) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isActive: true, token: true },
    });

    if (!user || !user.isActive) {
      logger.warn(`❌ [BE] Không tìm thấy user hoặc user bị vô hiệu hóa: ${payload.userId}`);
      return next(new Error("Authentication error: User not found or inactive"));
    }

    // Một tài khoản thí sinh một thiết bị (giống API REST): token cũ bị từ chối.
    if (payload.role === "Student" && user.token !== token) {
      logger.warn(`❌ [BE] Token thí sinh không còn hiệu lực (đăng nhập thiết bị khác): ${payload.userId}`);
      return next(new Error("Authentication error: Logged in on another device"));
    }

    if (payload.role === "Student") {
      const currentContestantId = await findCurrentContestantId(payload.userId);
      const contestant = await prisma.contestant.findFirst({
        where: { id: currentContestantId ?? -1 },
        select: { id: true, contestId: true },
      });

      if (!contestant) {
        logger.warn(`❌ [BE] Không tìm thấy contestant cho student với userId: ${payload.userId}`);
        return next(new Error("Authentication error: Contestant not found"));
      }
      (socket as AuthenticatedSocket).contestantId = contestant.id;

      const activeMatch = await prisma.match.findFirst({
        where: { round: { contestId: contestant.contestId } },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (activeMatch) (socket as AuthenticatedSocket).matchId = activeMatch.id;

      logger.info(
        `✅ Student authenticated: ${socket.id} | UserId: ${payload.userId} | Contestant: ${contestant.id} | Match: ${activeMatch?.id || "none"}`
      );
    }

    (socket as AuthenticatedSocket).user = payload;
    next();
  } catch (err) {
    logger.error(`❌ Token verification failed: ${(err as Error).message}`);
    next(new Error("Authentication error"));
  }
};

/**
 * Khởi tạo và cấu hình Socket.IO server với namespace và xác thực
 */
export const initializeSocketIO = (io: Server) => {
  logger.info("🔌 Initializing Socket.IO server...");

  // Gán instance để dùng toàn cục
  socketService.setIO(io);

  // Initialize timer service
  timerService.setIO(io);

  // Namespace điều khiển trận đấu (dành cho Admin/Judge) - Đã tích hợp online control
  const matchControlNamespace = io.of("/match-control");

  // Enable authentication middleware
  matchControlNamespace.use(authMiddleware);

  matchControlNamespace.on("connection", (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const user = authSocket.user;

    logger.info(
      `✅ Connected to /match-control: ${socket.id} | User: ${user.username} (${user.userId}) | Role: ${user.role}`
    );

    // Đăng ký các sự kiện riêng cho namespace này (bao gồm cả online control)
    // Sự kiện khán giả đã được đăng ký (chỉ cho Admin) trong registerMatchControlEvents.
    registerMatchControlEvents(io, authSocket);
    if (user.role === "Admin") {
      registerTestEvents(io, authSocket);
    }

    socket.on("disconnect", reason => {
      logger.info(
        `❌ Disconnected from /match-control: ${socket.id}. Reason: ${reason}`
      );
    });
  });

  // Namespace dành riêng cho Student
  const studentNamespace = io.of("/student");
  studentNamespace.use(authMiddleware);

  studentNamespace.on("connection", async (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;

    // Một thí sinh chỉ có một kết nối: đá kết nối cũ (thiết bị cũ, kết nối treo
    // sau khi rớt mạng) để sự kiện không bị gửi trùng và trạng thái không lệch.
    for (const [id, other] of studentNamespace.sockets) {
      if (id !== socket.id && (other as AuthenticatedSocket).user?.userId === authSocket.user.userId) {
        other.emit("session:replaced", { message: "Tài khoản đã đăng nhập ở thiết bị khác" });
        other.disconnect(true);
      }
    }

    // Register all student namespace events using the dedicated namespace handler
    await registerStudentNamespaceEvents(io, authSocket);
  });

  logger.info(
    "✅ Socket.IO server initialized with /match-control and /student namespaces."
  );
};

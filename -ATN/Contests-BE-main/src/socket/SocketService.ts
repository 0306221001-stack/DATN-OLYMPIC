// src/socket/SocketService.ts
import { Server } from "socket.io";
import { logger } from "@/utils/logger";

class SocketService {
  private static instance: SocketService;
  private _io: Server | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public setIO(io: Server): void {
    logger.info("✅ [SocketService] setIO called");
    if (this._io) {
      logger.warn(
        "⚠️ [SocketService] Socket.IO server instance is already set."
      );
      return;
    }
    this._io = io;
    logger.info("🎉 [SocketService] Socket.IO initialized successfully.");
  }

  public getIO(): Server {
    logger.info("🔍 [SocketService] getIO called");
    if (!this._io) {
      logger.error("❌ [SocketService] getIO called before setIO");
      throw new Error(
        "Socket.IO server has not been initialized. Call setIO() first."
      );
    }
    return this._io;
  }

  public emitToRoom(room: string, event: string, data: any): void {
    logger.info(`📤 [SocketService] Emitting '${event}' to room '${room}'`, {
      data,
    });
    this.getIO().to(room).emit(event, data);
  }
}

export const socketService = SocketService.getInstance();

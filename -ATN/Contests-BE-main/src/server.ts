// Alias "@" -> dist chỉ dành cho bản đã biên dịch (node dist/server.js).
// Khi chạy ts-node lúc phát triển, tsconfig-paths trỏ "@" về src; nếu vẫn
// đăng ký alias này thì code sửa trong src không có tác dụng cho tới khi build lại.
if (__filename.endsWith(".js")) {
  require("module-alias/register");
}
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

import app from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { logger } from "./utils/logger";
import { initializeSocketIO } from "./socket";

const PORT = process.env.PORT || 3000;

// Graceful shutdown handler
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close database connection
  await disconnectDatabase();

  // Exit process
  process.exit(0);
};

// Start server

const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [
  "http://localhost:5173",
];

app.use(
  cors({
    origin: true, // Cho phép mọi origin (bao gồm cả Flutter Web local)
  credentials: true,
  })
);

const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Tạo server HTTP từ app Express
    const httpServer = http.createServer(app);
    // Socket.IO initialization
    // Khởi tạo Socket.IO và gắn vào server
    initializeSocketIO(
      new Server(httpServer, {
        cors: {
          origin: allowedOrigins,
          methods: ["GET", "POST"],
          credentials: true,
        },
      })
    );

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`📖 API Documentation: http://localhost:${PORT}/api/v1`);
      logger.info(`❤️  Health Check: http://localhost:${PORT}/health`);
    });

    // Handle graceful shutdown
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error: Error) => {
      logger.error("Uncaught Exception:", error);
      gracefulShutdown("uncaughtException");
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason: unknown) => {
      logger.error("Unhandled Rejection:", reason);
      gracefulShutdown("unhandledRejection");
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the application
startServer();

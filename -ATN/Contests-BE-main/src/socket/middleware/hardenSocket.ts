import { Socket } from "socket.io";
import { logger } from "@/utils/logger";

/** Số sự kiện tối đa một socket được gửi trong 1 giây; vượt thì bỏ qua phần dư. */
const MAX_EVENTS_PER_SECOND = 100;
/** Vượt mức này trong 1 giây thì coi là tấn công/lỗi nặng và ngắt kết nối. */
const DISCONNECT_EVENTS_PER_SECOND = 1000;

/**
 * Lớp bảo vệ chung cho mọi socket, gọi TRƯỚC khi đăng ký các handler:
 *  1. Giới hạn tốc độ: một máy gửi dồn hàng nghìn yêu cầu không làm chậm máy khác.
 *  2. Luôn có hàm phản hồi (callback): handler gọi `callback(...)` không bị
 *     "callback is not a function" khi client quên gửi kèm.
 *  3. Bắt mọi lỗi (đồng bộ lẫn bất đồng bộ) trong handler: ghi log và trả lỗi
 *     cho client thay vì để lỗi rơi ra ngoài làm hỏng tiến trình.
 */
export const hardenSocket = (socket: Socket): void => {
  let windowStart = Date.now();
  let count = 0;

  socket.use((packet, next) => {
    const now = Date.now();
    if (now - windowStart >= 1000) {
      windowStart = now;
      count = 0;
    }
    count += 1;

    if (count > DISCONNECT_EVENTS_PER_SECOND) {
      logger.warn(
        `🚫 Ngắt socket ${socket.id}: gửi quá ${DISCONNECT_EVENTS_PER_SECOND} sự kiện/giây`
      );
      socket.disconnect(true);
      return;
    }
    if (count > MAX_EVENTS_PER_SECOND) {
      // Bỏ qua, không gọi next: sự kiện dư bị loại.
      if (count === MAX_EVENTS_PER_SECOND + 1) {
        logger.warn(
          `⚠️ Socket ${socket.id} gửi quá ${MAX_EVENTS_PER_SECOND} sự kiện/giây, bỏ qua phần dư`
        );
      }
      return;
    }

    // Thiếu callback: bổ sung hàm rỗng. Nếu client chỉ gửi tên sự kiện thì dữ
    // liệu là undefined (không để callback rơi vào vị trí của dữ liệu).
    if (typeof packet[packet.length - 1] !== "function") {
      if (packet.length === 1) packet.push(undefined);
      packet.push(() => undefined);
    }
    next();
  });

  const originalOn = socket.on.bind(socket) as (
    event: string,
    listener: (...args: unknown[]) => unknown
  ) => Socket;

  const reportError = (event: string, args: unknown[], error: unknown) => {
    logger.error(
      `❌ Lỗi trong handler "${event}" của socket ${socket.id}:`,
      error
    );
    const callback = args[args.length - 1];
    if (typeof callback === "function") {
      try {
        callback({ success: false, message: "Lỗi máy chủ khi xử lý yêu cầu" });
      } catch {
        // callback của client lỗi: bỏ qua.
      }
    }
  };

  (socket as unknown as { on: typeof originalOn }).on = (event, listener) =>
    originalOn(event, (...args: unknown[]) => {
      try {
        const result = listener(...args);
        if (result && typeof (result as Promise<unknown>).catch === "function") {
          (result as Promise<unknown>).catch(error =>
            reportError(event, args, error)
          );
        }
      } catch (error) {
        reportError(event, args, error);
      }
    });
};

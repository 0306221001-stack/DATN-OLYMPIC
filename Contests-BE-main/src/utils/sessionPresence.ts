// Theo dõi phiên đang hoạt động của từng tài khoản (lưu trong bộ nhớ tiến trình)
// để chặn đăng nhập lần hai từ thiết bị khác khi thiết bị đầu vẫn đang dùng.
//
// Một phiên được coi là "đang hoạt động" khi:
//  - còn ít nhất một kết nối Socket.IO của tài khoản, hoặc
//  - tài khoản vừa gọi API / vừa ngắt socket trong ACTIVE_WINDOW_MS gần nhất.
// Thiết bị đã đóng app quá ACTIVE_WINDOW_MS thì tài khoản được giải phóng,
// tránh khóa tài khoản vĩnh viễn khi người dùng mất máy hoặc quên đăng xuất.
// Khởi động lại máy chủ thì dữ liệu này mất, phiên sẽ được ghi lại ở lần gọi
// API hoặc kết nối socket kế tiếp của thiết bị đang dùng.

import { Socket } from "socket.io";
import cookie from "cookie";
import { prisma } from "@/config/database";
import { logger } from "@/utils/logger";

/** Khoảng thời gian (ms) sau lần hoạt động cuối mà phiên vẫn được giữ. */
export const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

export const ACCOUNT_IN_USE_CODE = "ACCOUNT_ALREADY_LOGGED_IN";
export const ACCOUNT_IN_USE_MESSAGE =
  "Tài khoản này đang được đăng nhập trên một thiết bị khác. Vui lòng đăng xuất ở thiết bị đó hoặc liên hệ ban tổ chức.";

interface Presence {
  deviceId: string | null;
  lastSeenAt: number;
  sockets: Set<string>;
}

const presences = new Map<number, Presence>();

const getOrCreate = (userId: number): Presence => {
  let presence = presences.get(userId);
  if (!presence) {
    presence = { deviceId: null, lastSeenAt: Date.now(), sockets: new Set() };
    presences.set(userId, presence);
  }
  return presence;
};

export const SessionPresence = {
  /** Chỉ áp dụng giới hạn một thiết bị cho Thí sinh và Trọng tài. */
  appliesTo(role: string): boolean {
    return role === "Student" || role === "Judge";
  },

  /** Ghi nhận thiết bị vừa đăng nhập thành công. */
  bindDevice(userId: number, deviceId: string | null): void {
    presences.set(userId, {
      deviceId,
      lastSeenAt: Date.now(),
      sockets: new Set(),
    });
  },

  /** Ghi nhận tài khoản vừa hoạt động (gọi API bằng token hợp lệ). */
  touch(userId: number): void {
    getOrCreate(userId).lastSeenAt = Date.now();
  },

  addSocket(userId: number, socketId: string): void {
    const presence = getOrCreate(userId);
    presence.sockets.add(socketId);
    presence.lastSeenAt = Date.now();
  },

  removeSocket(userId: number, socketId: string): void {
    const presence = presences.get(userId);
    if (!presence) return;
    presence.sockets.delete(socketId);
    // Bắt đầu tính thời gian chờ từ lúc ngắt kết nối để mạng chập chờn
    // không làm mất phiên.
    presence.lastSeenAt = Date.now();
  },

  /** Đăng xuất: giải phóng tài khoản ngay. */
  clear(userId: number): void {
    presences.delete(userId);
  },

  /**
   * `true` nếu tài khoản đang được dùng trên một thiết bị KHÁC [deviceId].
   * Cùng một thiết bị đăng nhập lại luôn được phép.
   */
  isActiveOnOtherDevice(userId: number, deviceId: string | null): boolean {
    const presence = presences.get(userId);
    if (!presence) return false;

    if (deviceId && presence.deviceId === deviceId) return false;

    const isActive =
      presence.sockets.size > 0 ||
      Date.now() - presence.lastSeenAt < ACTIVE_WINDOW_MS;
    return isActive;
  },
};

/**
 * Giữ phiên của tài khoản trong suốt thời gian socket còn kết nối.
 * Chỉ tính socket mang đúng accessToken hiện hành trong DB, để socket còn sót
 * của thiết bị cũ không giữ tài khoản.
 */
export const trackSocketSession = async (
  socket: Socket,
  userId: number,
  role: string
): Promise<void> => {
  if (!SessionPresence.appliesTo(role)) return;

  try {
    const rawCookie = socket.handshake.headers.cookie;
    const token = rawCookie ? cookie.parse(rawCookie).accessToken : undefined;
    if (!token) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { token: true },
    });
    if (!user || user.token !== token) return;
    if (socket.disconnected) return;

    SessionPresence.addSocket(userId, socket.id);
    socket.on("disconnect", () => {
      SessionPresence.removeSocket(userId, socket.id);
    });
  } catch (error) {
    logger.error("Không thể ghi nhận phiên socket:", error);
  }
};

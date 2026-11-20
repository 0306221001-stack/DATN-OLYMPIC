import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

/**
 * Nhận sự kiện real-time từ server khi danh sách thí sinh của cuộc thi thay đổi
 * (thêm / sửa / xóa thí sinh, chia nhóm) và tự tải lại danh sách.
 * Trả về `isConnected` để trang có thể bật polling dự phòng khi mất kết nối.
 */
export const useContestantsRealtime = (contestSlug: string | undefined) => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!contestSlug) return;

    const socket = io(`${SOCKET_URL}/match-control`, {
      withCredentials: true,
    });

    const subscribe = () => {
      socket.emit(
        "contestants:subscribe",
        { contestSlug },
        (res?: { success: boolean }) => setIsConnected(!!res?.success)
      );
    };

    const refreshLists = () => {
      queryClient.invalidateQueries({ queryKey: ["contestant-contest"] });
      queryClient.invalidateQueries({ queryKey: ["contestants-in-match"] });
    };

    // connect cũng chạy lại sau khi tự kết nối lại -> đăng ký lại phòng và bù dữ liệu bị lỡ
    socket.on("connect", () => {
      subscribe();
      refreshLists();
    });
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("contestants:changed", refreshLists);

    return () => {
      socket.off("contestants:changed", refreshLists);
      socket.disconnect();
      setIsConnected(false);
    };
  }, [contestSlug, queryClient]);

  return { isConnected };
};

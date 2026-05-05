import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000";

/** Hook que conecta al WebSocket del backend */
export function useSocket(): Socket {
  const socketRef = useRef<Socket | null>(null);

  if (!socketRef.current) {
    socketRef.current = io(BACKEND, { path: "/real-time" });
  }

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return socketRef.current;
}

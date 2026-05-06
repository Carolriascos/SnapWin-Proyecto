import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:3000";

let globalSocket: Socket | null = null;

export function useSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      path: "/real-time",
      transports: ["polling", "websocket"],
      autoConnect: true,
      reconnection: true,
    });
  }

  useEffect(() => {
    if (!globalSocket?.connected) {
      globalSocket?.connect();
    }
  }, []);

  return globalSocket as Socket;
}
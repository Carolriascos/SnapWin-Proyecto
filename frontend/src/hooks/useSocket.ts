import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

// En celular window.location.hostname es la IP del túnel ngrok
// En PC es localhost
const SOCKET_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : ''

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
import { useEffect } from "react"
import { io, Socket } from "socket.io-client"
import { getSocketUrl } from "../config/api"

let globalSocket: Socket | null = null

export function useSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(getSocketUrl(), {
      path: "/real-time",
      transports: ["polling", "websocket"],
      autoConnect: true,
      reconnection: true,
    })
  }

  useEffect(() => {
    if (!globalSocket?.connected) {
      globalSocket?.connect()
    }
  }, [])

  return globalSocket as Socket
}

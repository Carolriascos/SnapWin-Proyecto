import { Socket } from 'socket.io-client'

export function rejoinOnResume(
  socket: Socket,
  joinData: { salaId: string; jugador: Record<string, unknown> } | null,
) {
  if (!joinData) return

  const emitJoin = () => socket.emit('join-sala', joinData)

  const onVisible = () => {
    if (document.visibilityState !== 'visible') return
    if (socket.connected) emitJoin()
    else {
      socket.once('connect', emitJoin)
      socket.connect()
    }
  }

  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('pageshow', onVisible)
  socket.on('reconnect', emitJoin)

  return () => {
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('pageshow', onVisible)
    socket.off('reconnect', emitJoin)
  }
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'
import { Jugador } from '../../types'

/** Sala de espera visible en la pantalla grande del mall */
export default function MallWaitingPage() {
  const navigate  = useNavigate()
  const socket    = useSocket()
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
  socket.emit("join-sala", { salaId: "sala-001", jugador: { id: "mall-screen" } })

  socket.on("players-update", (data: Jugador[]) => setJugadores(data))
  socket.on("countdown",      ({ count }: { count: number }) => setCountdown(count))
  socket.on("game-start",     () => navigate("/mall/shake"))

  return () => {
    socket.off("players-update")
    socket.off("countdown")
    socket.off("game-start")
  }
}, [socket, navigate])

  return (
    <div>
      <h1>⏳ Sala de espera</h1>
      <h2>Jugadores conectados:</h2>
      {jugadores.length === 0
        ? <p>Esperando jugadores...</p>
        : jugadores.map(j => <p key={j.id}>🎮 {j.nombre || 'Jugador'}</p>)
      }
      {countdown !== null && (
        <div style={{ fontSize: '5rem', fontWeight: 'bold', color: 'red' }}>
          {countdown > 0 ? countdown : '¡JUEGO!'}
        </div>
      )}
    </div>
  )
}

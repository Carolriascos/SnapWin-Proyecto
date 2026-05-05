import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'
import { Jugador } from '../../types'

/** Sala de espera — se actualiza en tiempo real con Socket.io */
export default function WaitingPage() {
  const navigate  = useNavigate()
  const socket    = useSocket()
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    const jugadorId = localStorage.getItem('jugadorId') ?? 'sin-id'
    const salaId    = localStorage.getItem('salaId')    ?? 'sala-001'

    socket.emit('join-sala', { salaId, jugador: { id: jugadorId } })

    socket.on('players-update', (data: Jugador[]) => setJugadores(data))
    socket.on('countdown',      ({ count }: { count: number }) => setCountdown(count))
    socket.on('game-start',     () => navigate('/shake'))

    return () => {
      socket.off('players-update')
      socket.off('countdown')
      socket.off('game-start')
    }
  }, [socket, navigate])

  return (
    <div>
      <h1> Sala de espera</h1>
      <p>Jugadores conectados: {jugadores.length}</p>
      {jugadores.map(j => <p key={j.id}>🎮 {j.nombre || 'Jugador'}</p>)}
      {countdown !== null && (
        <div style={{ fontSize: '4rem', fontWeight: 'bold' }}>
          {countdown > 0 ? countdown : '¡Ya!'}
        </div>
      )}
    </div>
  )
}

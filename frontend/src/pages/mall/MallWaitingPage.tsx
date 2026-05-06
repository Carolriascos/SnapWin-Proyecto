import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'
import { Jugador } from '../../types'

export default function MallWaitingPage() {
  const navigate  = useNavigate()
  const socket    = useSocket()
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    const emitJoin = () => {
      socket.emit('join-sala', { 
        salaId: 'sala-001', 
        jugador: { id: 'mall-screen', nombre: 'Mall' } 
      })
    }

    if (socket.connected) {
      emitJoin()
    } else {
      socket.on('connect', emitJoin)
    }

    socket.on('players-update', (data: Jugador[]) => setJugadores(data))
    socket.on('countdown',      ({ count }: { count: number }) => setCountdown(count))
    socket.on('game-start',     () => navigate('/mall/shake'))

    return () => {
      socket.off('connect', emitJoin)
      socket.off('players-update')
      socket.off('countdown')
      socket.off('game-start')
    }
  }, [socket, navigate])

  return (
    <div>
      <h1>⏳ Sala de espera</h1>
      <h2>Jugadores conectados:</h2>
      {jugadores.filter(j => j.id !== 'mall-screen').length === 0
        ? <p>Esperando jugadores...</p>
        : jugadores
            .filter(j => j.id !== 'mall-screen')
            .map(j => <p key={j.id}>🎮 {j.nombre || 'Jugador'}</p>)
      }
      {countdown !== null && (
        <div style={{ fontSize: '5rem', fontWeight: 'bold', color: 'red' }}>
          {countdown > 0 ? countdown : '¡JUEGO!'}
        </div>
      )}
    </div>
  )
}
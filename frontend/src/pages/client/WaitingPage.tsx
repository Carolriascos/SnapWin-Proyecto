import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'
import { Jugador } from '../../types'

export default function WaitingPage() {
  const navigate  = useNavigate()
  const socket    = useSocket()
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    const jugadorId = localStorage.getItem('jugadorId') ?? 'sin-id'
    const nombre    = localStorage.getItem('nombre')    ?? 'Jugador'
    const salaId    = localStorage.getItem('salaId')    ?? 'sala-001'

    console.log('--- WaitingPage montado ---')
    console.log('jugadorId:', jugadorId)
    console.log('nombre:', nombre)
    console.log('salaId:', salaId)
    console.log('socket conectado:', socket.connected)
    console.log('socket id:', socket.id)

    const emitJoin = () => {
      console.log('Emitiendo join-sala...')
      socket.emit('join-sala', { salaId, jugador: { id: jugadorId, nombre } })
    }

    if (socket.connected) {
      emitJoin()
    } else {
      console.log('Socket no conectado, esperando connect...')
      socket.on('connect', emitJoin)
    }

    socket.on('players-update', (data: any) => {
      console.log('players-update recibido:', data)
      setJugadores(data)
    })

    socket.on('countdown', ({ count }: { count: number }) => {
      console.log('countdown:', count)
      setCountdown(count)
    })

    socket.on('game-start', () => {
      console.log('game-start recibido!')
      navigate('/shake')
    })

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
      <p>Jugadores conectados: {jugadores.length}</p>
      {jugadores.map(j => (
        <p key={j.id}>🎮 {j.nombre || 'Jugador'}</p>
      ))}
      {countdown !== null && (
        <div style={{ fontSize: '4rem', fontWeight: 'bold' }}>
          {countdown > 0 ? countdown : '¡Ya!'}
        </div>
      )}
    </div>
  )
}
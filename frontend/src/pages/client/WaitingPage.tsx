import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'
import { Jugador } from '../../types'
import SnapHeader from '../../components/SnapHeader'
import { getGameMode, getGameLabel, hasGameMode } from '../../utils/gameMode'

export default function WaitingPage() {
  const navigate  = useNavigate()
  const socket    = useSocket()
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    if (!hasGameMode()) {
      navigate('/')
      return
    }
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
      socket.emit('join-sala', {
        salaId,
        jugador: { id: jugadorId, nombre, gameMode: getGameMode() },
      })
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

    socket.on('game-start', ({ game }: { game?: string }) => {
      const modo = game === 'dodge' || game === 'shake' ? game : getGameMode()
      console.log('game-start recibido!', modo)
      navigate(modo === 'dodge' ? '/dodge' : '/shake')
    })

    return () => {
      socket.off('connect', emitJoin)
      socket.off('players-update')
      socket.off('countdown')
      socket.off('game-start')
    }
  }, [socket, navigate])

  const progressPct =
    countdown !== null && countdown > 0 ? ((4 - Math.min(countdown, 3)) / 3) * 100 : 60

  return (
    <div className="snap-screen">
      <div className="snap-pattern" aria-hidden />
      <SnapHeader compact />
      <main className="snap-content">
        {countdown === null ? (
          <div className="waiting-prep">
            <div className="waiting-controller" aria-hidden>🎮</div>
            <p className="waiting-status">Preparando {getGameLabel()}...</p>
            <div className="waiting-players-box">
              <p className="waiting-players-count">{jugadores.length}</p>
              <p className="waiting-players-label">Jugadores conectados</p>
              <div className="waiting-player-list">
                {jugadores.map(j => (
                  <p key={j.id}>🎮 {j.nombre || 'Jugador'}</p>
                ))}
              </div>
            </div>
            <div className="waiting-dots" aria-hidden>
              <span /><span /><span />
            </div>
          </div>
        ) : (
          <div className="waiting-countdown">
            <p className="waiting-countdown__label">Prepárate</p>
            <div className="waiting-countdown__number">
              {countdown > 0 ? countdown : '¡Ya!'}
            </div>
            <p className="waiting-countdown__hint">El juego empieza en...</p>
            <div className="waiting-progress">
              <div
                className="waiting-progress__bar"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="waiting-countdown__sub">Ten tu celular listo</p>
          </div>
        )}
      </main>
    </div>
  )
}

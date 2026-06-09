import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'
import { Jugador } from '../../types'
import MallHeader from '../../components/MallHeader'
import { rejoinOnResume } from '../../utils/sessionRejoin'

const MALL_JOIN = { salaId: 'sala-001', jugador: { id: 'mall-screen', nombre: 'Mall' } }

export default function MallWaitingPage() {
  const navigate  = useNavigate()
  const socket    = useSocket()
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    const emitJoin = () => socket.emit('join-sala', MALL_JOIN)

    if (socket.connected) emitJoin()
    else socket.on('connect', emitJoin)

    socket.on('players-update', (data: Jugador[]) => {
      setJugadores(data)
    })

    socket.on('countdown', ({ count }: { count: number }) => setCountdown(count))

    socket.on('game-start', ({ game }: { game?: string }) =>
      navigate(game === 'dodge' ? '/mall/dodge' : '/mall/shake')
    )

    socket.on('round-reset', () => {
      setJugadores([])
      setCountdown(null)
    })

    const cleanupRejoin = rejoinOnResume(socket, MALL_JOIN)

    return () => {
      socket.off('connect', emitJoin)
      socket.off('players-update')
      socket.off('countdown')
      socket.off('game-start')
      socket.off('round-reset')
      cleanupRejoin?.()
    }
  }, [socket, navigate])

  return (
    <div className="mall-screen">
      <div className="mall-pattern" aria-hidden />
      <MallHeader />

      {countdown !== null ? (
        <div className="mall-countdown">
          <div className="mall-countdown__ring">
            <p className="mall-countdown__label">GET READY</p>
            <p className="mall-countdown__hint">Something is about to drop</p>
            <p className="mall-countdown__number">
              {countdown > 0 ? String(countdown).padStart(2, '0') : '¡YA!'}
            </p>
          </div>
        </div>
      ) : (
        <div className="mall-waiting">
          <div className="mall-waiting__glow" aria-hidden />
          <h2 className="mall-waiting__title">SALA DE ESPERA</h2>
          <p className="mall-waiting__count">
            {jugadores.length} JUGADOR{jugadores.length !== 1 ? 'ES' : ''}
          </p>

          {jugadores.length === 0 ? (
            <p className="mall-waiting__empty">Esperando jugadores...</p>
          ) : (
            <div className="mall-waiting__grid">
              {jugadores.map(j => (
                <p key={j.id} className="mall-player-chip">
                  {j.nombre || 'Jugador'}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

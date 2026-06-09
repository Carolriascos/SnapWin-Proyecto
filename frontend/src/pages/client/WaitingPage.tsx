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
    if (!hasGameMode()) { navigate('/'); return }

    const jugadorId = localStorage.getItem('jugadorId') ?? 'sin-id'
    const nombre    = localStorage.getItem('nombre')    ?? 'Jugador'
    const color     = localStorage.getItem('color')     ?? '#7c3aed'
    const salaId    = localStorage.getItem('salaId')    ?? 'sala-001'

    const emitJoin = () => {
      socket.emit('join-sala', {
        salaId,
        jugador: { id: jugadorId, nombre, color, gameMode: getGameMode() },
      })
    }

    if (socket.connected) emitJoin()
    else socket.on('connect', emitJoin)

    socket.on('players-update', (data: any) => {
      const soloJugadores = data.filter((j: any) =>
        j.id !== 'mall-screen' &&
        j.id !== 'admin-panel' &&
        j.nombre !== 'Mall' &&
        j.nombre !== 'Admin'
      )
      setJugadores(soloJugadores)
    })

    socket.on('countdown', ({ count }: { count: number }) => setCountdown(count))

    socket.on('game-start', ({ game }: { game?: string }) => {
      const modo = game === 'dodge' || game === 'shake' ? game : getGameMode()
      navigate(modo === 'dodge' ? '/dodge' : '/shake')
    })

    socket.on('round-reset', () => {
      setJugadores([])
      setCountdown(null)
    })

    return () => {
      socket.off('connect', emitJoin)
      socket.off('players-update')
      socket.off('countdown')
      socket.off('game-start')
      socket.off('round-reset')
    }
  }, [socket, navigate])

  const progressPct = countdown !== null && countdown > 0
    ? ((30 - Math.min(countdown, 30)) / 30) * 100
    : 0

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
                  <p key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: j.color, display: 'inline-block' }} />
                    {j.nombre || 'Jugador'}
                  </p>
                ))}
              </div>
            </div>
            <p style={{ color: '#a855f7', marginTop: '1rem', fontSize: '0.9rem' }}>
              {jugadores.length < 2 ? 'Esperando al menos 2 jugadores...' : '¡Listo! El juego arrancará pronto'}
            </p>
            <div className="waiting-dots" aria-hidden><span /><span /><span /></div>
          </div>
        ) : (
          <div className="waiting-countdown">
            <p className="waiting-countdown__label">Prepárate</p>
            <div className="waiting-countdown__number">{countdown > 0 ? countdown : '¡Ya!'}</div>
            <p className="waiting-countdown__hint">El juego empieza en...</p>
            <div className="waiting-progress">
              <div className="waiting-progress__bar" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="waiting-countdown__sub">Ten tu celular listo</p>
          </div>
        )}
      </main>
    </div>
  )
}
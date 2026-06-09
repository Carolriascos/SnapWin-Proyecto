import { useEffect, useRef, useState } from 'react'
import { useSocket } from '../../hooks/useSocket'
import { useNavigate } from 'react-router-dom'
import MallHeader from '../../components/MallHeader'
import { rejoinOnResume } from '../../utils/sessionRejoin'
import '../../styles/pages/mall/dodge-live.css'

const MALL_JOIN = { salaId: 'sala-001', jugador: { id: 'mall-screen', nombre: 'Mall' } }

interface JugadorDodge {
  nombre: string
  color: string
  carril: number
  vidas: number
  puntos: number
  eliminado: boolean
  obstaculos: { id: number; lane: number; y: number }[]
}

const LANES = 4
const VIDAS_INICIAL = 3

function laneX(lane: number) {
  return ((lane + 0.5) / LANES) * 100
}

function jugadorVacio(nombre = 'Jugador', color = '#7c3aed'): JugadorDodge {
  return { nombre, color, carril: 1, vidas: VIDAS_INICIAL, puntos: 0, eliminado: false, obstaculos: [] }
}

function rosterToJugadores(roster: { id: string; nombre?: string; color?: string }[]): Record<string, JugadorDodge> {
  const next: Record<string, JugadorDodge> = {}
  roster.forEach(j => {
    next[j.id] = jugadorVacio(j.nombre, j.color)
  })
  return next
}

export default function DodgeLivePage() {
  const socket   = useSocket()
  const navigate = useNavigate()

  const [jugadores, setJugadores] = useState<Record<string, JugadorDodge>>({})
  const [countdown, setCountdown] = useState<number | null>(null)
  const [gameOver,  setGameOver]  = useState(false)

  const inGameRef    = useRef(false)
  const rankingRef   = useRef<{ jugadorId: string; nombre: string; puntos: number; color: string }[]>([])

  useEffect(() => {
    const emitJoin = () => socket.emit('join-sala', MALL_JOIN)
    if (socket.connected) emitJoin()
    else socket.on('connect', emitJoin)

    const cleanupRejoin = rejoinOnResume(socket, MALL_JOIN)

    socket.on('players-update', (data: { id: string; nombre?: string; color?: string }[]) => {
      if (inGameRef.current) return
      setJugadores(rosterToJugadores(data))
    })

    socket.on('dodge-player-state', (data: {
      jugadorId: string
      nombre?: string
      color?: string
      carril: number
      vidas: number
      puntos: number
      eliminado: boolean
      obstaculos?: { id: number; lane: number; y: number }[]
    }) => {
      setJugadores(prev => {
        const base = prev[data.jugadorId] ?? jugadorVacio(data.nombre, data.color)
        return {
          ...prev,
          [data.jugadorId]: {
            ...base,
            nombre:    data.nombre ?? base.nombre,
            color:     data.color  ?? base.color,
            carril:    data.carril,
            vidas:     data.vidas,
            puntos:    data.puntos,
            eliminado: data.eliminado,
            obstaculos: data.obstaculos ?? base.obstaculos,
          },
        }
      })
    })

    socket.on('countdown', ({ count }: { count: number }) => {
      setCountdown(count > 0 ? count : null)
    })

    socket.on('game-start', ({ game, jugadores: roster }: { game?: string; jugadores?: { id: string; nombre?: string; color?: string }[] }) => {
      if (game && game !== 'dodge') return
      inGameRef.current = true
      setCountdown(null)
      setGameOver(false)
      if (roster && roster.length > 0) {
        setJugadores(rosterToJugadores(roster))
      } else {
        setJugadores(prev => {
          const next = { ...prev }
          Object.keys(next).forEach(id => {
            next[id] = { ...next[id], vidas: VIDAS_INICIAL, puntos: 0, eliminado: false, obstaculos: [], carril: 1 }
          })
          return next
        })
      }
    })

    socket.on('partida-finalizada', ({ ranking }: { ranking: any[] }) => {
      if (ranking.length > 0) rankingRef.current = ranking
      inGameRef.current = false
      setGameOver(true)
      setTimeout(() => {
        navigate('/mall/results', { state: { ranking: rankingRef.current, game: 'dodge' } })
      }, 4500)
    })

    socket.on('ranking-partida', (ranking: any[]) => {
      if (ranking.length === 0) {
        rankingRef.current = []
        inGameRef.current = false
        setJugadores({})
      } else {
        rankingRef.current = ranking
      }
    })

    socket.on('round-reset', () => {
      inGameRef.current = false
      setJugadores({})
      setCountdown(null)
      setGameOver(false)
      rankingRef.current = []
      navigate('/mall/waiting')
    })

    return () => {
      socket.off('connect', emitJoin)
      socket.off('players-update')
      socket.off('dodge-player-state')
      socket.off('countdown')
      socket.off('game-start')
      socket.off('partida-finalizada')
      socket.off('ranking-partida')
      socket.off('round-reset')
      cleanupRejoin?.()
    }
  }, [socket, navigate])

  const lista = Object.entries(jugadores)

  const listaOrdenada = [...lista].sort(([, a], [, b]) => {
    if (a.eliminado !== b.eliminado) return a.eliminado ? 1 : -1
    return b.puntos - a.puntos
  })

  const getMedal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`

  const corazones = (vidas: number, color: string) =>
    Array.from({ length: VIDAS_INICIAL }, (_, i) => (
      <span
        key={i}
        style={{
          color: i < vidas ? color : 'rgba(255,255,255,0.2)',
          fontSize: '0.9rem',
          transition: 'color 0.3s',
        }}
      >
        ♥
      </span>
    ))

  return (
    <div className="mall-screen mall-dodge-page">
      <div className="mall-pattern" aria-hidden />
      <MallHeader />

      <div className="dodge-top">
        <h1 className="dodge-top__title">¡JUEGO EN VIVO!</h1>
        <span className="dodge-top__tag">DODGE GAME</span>
      </div>

      {countdown !== null && countdown > 0 && (
        <div className="dodge-countdown">
          ⏳ El juego empieza en {countdown}s
        </div>
      )}

      {lista.length === 0 ? (
        <p className="dodge-empty">Esperando jugadores...</p>
      ) : (
        <div
          className="dodge-grid"
          style={{ gridTemplateColumns: `repeat(${Math.min(lista.length, 4)}, 1fr)` }}
        >
          {listaOrdenada.map(([id, j]) => (
            <div
              key={id}
              className={`dodge-card ${j.eliminado ? 'dodge-card--dead' : ''}`}
              style={{ '--player-color': j.color } as React.CSSProperties}
            >
              <div className="dodge-card__header">
                <span className="dodge-card__name" style={{ color: j.color }}>
                  {j.nombre}
                </span>
              </div>

              <div className="dodge-card__field">
                {Array.from({ length: LANES - 1 }, (_, i) => (
                  <div
                    key={i}
                    className="dodge-lane-divider"
                    style={{ left: `${((i + 1) / LANES) * 100}%` }}
                  />
                ))}

                {j.obstaculos.map(o => (
                  <div
                    key={o.id}
                    className="dodge-obstacle"
                    style={{ left: `${laneX(o.lane)}%`, top: `${o.y}%` }}
                  />
                ))}

                <div
                  className={`dodge-player ${j.eliminado ? 'dodge-player--dead' : ''}`}
                  style={{
                    left:       `${laneX(j.carril)}%`,
                    background: j.eliminado ? 'rgba(255,255,255,0.2)' : j.color,
                  }}
                >
                  ▲
                </div>

                {j.eliminado && (
                  <div className="dodge-dead-overlay">
                    <span>💀</span>
                    <p>ELIMINADO</p>
                  </div>
                )}
              </div>

              <div className="dodge-card__stats">
                <div className="dodge-card__lives">
                  <span className="dodge-card__stats-label">LIFE</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {corazones(j.vidas, j.color)}
                  </div>
                </div>
                <div className="dodge-card__score">
                  <span className="dodge-card__stats-label">SCORE</span>
                  <span className="dodge-card__score-val" style={{ color: j.color }}>
                    {j.puntos.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="dodge-hint">TILT THE PHONE</p>

      {gameOver && rankingRef.current.length > 0 && (
        <div className="dodge-results-overlay">
          <div className="dodge-results-panel">
            <h2 className="dodge-results-panel__title">🏆 RESULTADOS</h2>
            <div className="dodge-results-podium">
              {[1, 0, 2].map((idx) => {
                const r = rankingRef.current[idx]
                if (!r) return null
                const heights = [140, 180, 110]
                return (
                  <div
                    key={r.jugadorId}
                    className="dodge-podium-place"
                    style={{
                      height:      heights[idx],
                      borderColor: r.color,
                      order:       idx === 0 ? 2 : idx === 1 ? 1 : 3,
                    }}
                  >
                    <span className="dodge-podium-place__medal">{getMedal(idx)}</span>
                    <span className="dodge-podium-place__name">{r.nombre}</span>
                    <span className="dodge-podium-place__pts" style={{ color: r.color }}>
                      {r.puntos.toLocaleString()} pts
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

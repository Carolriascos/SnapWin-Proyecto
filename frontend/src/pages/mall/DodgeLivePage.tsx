import { useCallback, useEffect, useRef, useState } from 'react'
import { useSocket } from '../../hooks/useSocket'
import { useNavigate } from 'react-router-dom'
import MallHeader from '../../components/MallHeader'
import '../../styles/pages/mall/dodge-live.css'

interface JugadorDodge {
  nombre: string
  color: string
  carril: number
  vidas: number
  puntos: number
  eliminado: boolean  
}

interface Obstaculo {
  id: number
  lane: number
  y: number
  hitIds: Set<string>   
}

const LANES         = 4
const VIDAS_INICIAL = 3
const SPAWN_MS      = 1400
const TICK_MS       = 40
const SPEED_PCT     = 2.8

function laneX(lane: number) {
  return ((lane + 0.5) / LANES) * 100
}

export default function DodgeLivePage() {
  const socket   = useSocket()
  const navigate = useNavigate()

  const [jugadores,  setJugadores]  = useState<Record<string, JugadorDodge>>({})
  const [obstaculos, setObstaculos] = useState<Obstaculo[]>([])
  const [countdown,  setCountdown]  = useState<number | null>(null)
  const [gameOver,   setGameOver]   = useState(false)

  const idRef        = useRef(0)
  const rankingRef   = useRef<{ jugadorId: string; nombre: string; puntos: number; color: string }[]>([])

  const resetLiveState = useCallback(() => {
    setJugadores({})
    setObstaculos([])
    setCountdown(null)
    setGameOver(false)
    rankingRef.current = []
  }, [])

  useEffect(() => {
    const emitJoin = () => {
      socket.emit('join-sala', {
        salaId: 'sala-001',
        jugador: { id: 'mall-screen', nombre: 'Mall' },
      })
    }
    if (socket.connected) emitJoin()
    else socket.on('connect', emitJoin)

    socket.on('players-update', (data: any[]) => {
      setJugadores(prev => {
        const next: Record<string, JugadorDodge> = {}
        data.forEach(j => {
          if (j.id === 'mall-screen' || j.id === 'admin-panel') return
          next[j.id] = {
            nombre:    j.nombre || prev[j.id]?.nombre || 'Jugador',
            color:     j.color  || prev[j.id]?.color  || '#7c3aed',
            carril:    prev[j.id]?.carril ?? 1,
            vidas:     prev[j.id]?.vidas ?? VIDAS_INICIAL,
            puntos:    prev[j.id]?.puntos ?? 0,
            eliminado: prev[j.id]?.eliminado ?? false,
          }
        })
        return next
      })
    })

    socket.on('dodge-update', ({ jugadorId, carril, posicion }: any) => {
      setJugadores(prev => {
        if (!prev[jugadorId]) return prev
        let lane = carril ?? 1
        if (posicion != null)
          lane = Math.min(3, Math.max(0, Math.round((posicion / 100) * 4 - 0.5)))
        return { ...prev, [jugadorId]: { ...prev[jugadorId], carril: lane } }
      })
    })

    socket.on('dodge-player-state', ({ jugadorId, carril, vidas, puntos }: any) => {
      setJugadores(prev => {
        if (!prev[jugadorId]) return prev
        const lane = typeof carril === 'number' ? Math.min(LANES - 1, Math.max(0, carril)) : prev[jugadorId].carril
        const vidasActual = typeof vidas === 'number' ? Math.max(0, vidas) : prev[jugadorId].vidas
        return {
          ...prev,
          [jugadorId]: {
            ...prev[jugadorId],
            carril: lane,
            vidas: vidasActual,
            puntos: typeof puntos === 'number' ? puntos : prev[jugadorId].puntos,
            eliminado: vidasActual <= 0,
          },
        }
      })
    })

    socket.on('countdown', ({ count }: { count: number }) => setCountdown(count))

    socket.on('game-start', () => {
      setCountdown(null)
      setGameOver(false)
      setObstaculos([])
      rankingRef.current = []
      setJugadores(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(id => {
          next[id] = { ...next[id], vidas: VIDAS_INICIAL, puntos: 0, eliminado: false }
        })
        return next
      })
    })

    socket.on('partida-finalizada', ({ ranking }: { ranking: any[] }) => {
      if (ranking?.length) rankingRef.current = ranking
      setGameOver(true)
      setTimeout(() => {
        navigate('/mall/results', { state: { ranking: rankingRef.current, game: 'dodge' } })
      }, 4500)
    })

    socket.on('ranking-partida', (ranking: any[]) => {
      if (ranking.length > 0) {
        rankingRef.current = ranking
      } else {
        resetLiveState()
      }
    })

    socket.on('round-reset', () => {
      resetLiveState()
      navigate('/mall/waiting')
    })

    return () => {
      socket.off('connect', emitJoin)
      socket.off('players-update')
      socket.off('dodge-update')
      socket.off('dodge-player-state')
      socket.off('countdown')
      socket.off('game-start')
      socket.off('partida-finalizada')
      socket.off('ranking-partida')
      socket.off('round-reset')
    }
  }, [socket, navigate, resetLiveState])

  useEffect(() => {
    const spawnId = setInterval(() => {
      if (gameOver) return
      setObstaculos(prev => [
        ...prev,
        { id: idRef.current++, lane: Math.floor(Math.random() * LANES), y: -8, hitIds: new Set<string>() },
      ])
    }, SPAWN_MS)

    const tickId = setInterval(() => {
      if (gameOver) return
      setObstaculos(prev => {
        return prev
          .map(o => ({ ...o, y: o.y + SPEED_PCT }))
          .filter(o => o.y < 105)
      })
    }, TICK_MS)

    return () => {
      clearInterval(spawnId)
      clearInterval(tickId)
    }
  }, [gameOver])

  const lista = Object.entries(jugadores).filter(([id]) => id !== 'mall-screen')

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
          El juego empieza en {countdown}s
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

                {obstaculos.map(o => (
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
                    <span></span>
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
            <h2 className="dodge-results-panel__title">RESULTADOS</h2>
            <div className="dodge-results-podium">
              {[1, 0, 2].map((idx) => {
                const j = rankingRef.current[idx]
                if (!j) return null
                const heights = [140, 180, 110]
                return (
                  <div
                    key={j.jugadorId}
                    className="dodge-podium-place"
                    style={{
                      height:      heights[idx],
                      borderColor: j.color,
                      order:       idx === 0 ? 2 : idx === 1 ? 1 : 3,
                    }}
                  >
                    <span className="dodge-podium-place__medal">{getMedal(idx)}</span>
                    <span className="dodge-podium-place__name">{j.nombre}</span>
                    <span className="dodge-podium-place__pts" style={{ color: j.color }}>
                      {j.puntos.toLocaleString()} pts
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

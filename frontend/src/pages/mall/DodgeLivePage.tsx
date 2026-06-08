import { useEffect, useRef, useState } from 'react'
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
  vivo: boolean
}

interface Obstaculo {
  id: number
  lane: number          
  y: number           
}


const LANES          = 4
const VIDAS_INICIAL  = 3
const SPAWN_MS       = 1400   
const TICK_MS        = 40     
const SPEED_PCT      = 2.8    
const HIT_THRESHOLD  = 14     


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

  const jugadoresRef = useRef<Record<string, JugadorDodge>>({})
  const idRef        = useRef(0)
  const rankingRef   = useRef<{ jugadorId: string; nombre: string; puntos: number; color: string }[]>([])


  useEffect(() => { jugadoresRef.current = jugadores }, [jugadores])


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
        const next = { ...prev }
        data.forEach(j => {
          if (j.id === 'mall-screen') return
          if (!next[j.id]) {
            next[j.id] = {
              nombre: j.nombre || 'Jugador',
              color:  j.color  || '#7c3aed',
              carril: 1,
              vidas:  VIDAS_INICIAL,
              puntos: 0,
              vivo:   true,
            }
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

    socket.on('countdown', ({ count }: { count: number }) => {
      setCountdown(count)
    })

    socket.on('game-start', () => {
      setCountdown(null)
      setGameOver(false)
      setObstaculos([])
      setJugadores(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(id => {
          next[id] = { ...next[id], vidas: VIDAS_INICIAL, puntos: 0, vivo: true }
        })
        return next
      })
    })

    socket.on('player-finished', () => {
      setGameOver(true)
      setTimeout(() => {
        navigate('/mall/results', { state: { ranking: rankingRef.current } })
      }, 4500)
    })

    socket.on('ranking-partida', (ranking: any[]) => {
      if (ranking.length > 0) rankingRef.current = ranking
    })

    return () => {
      socket.off('connect', emitJoin)
      socket.off('players-update')
      socket.off('dodge-update')
      socket.off('countdown')
      socket.off('game-start')
      socket.off('player-finished')
      socket.off('ranking-partida')
    }
  }, [socket, navigate])


  useEffect(() => {
    const spawnId = setInterval(() => {
      if (gameOver) return
      setObstaculos(prev => [
        ...prev,
        { id: idRef.current++, lane: Math.floor(Math.random() * LANES), y: -8 },
      ])
    }, SPAWN_MS)

    const tickId = setInterval(() => {
      if (gameOver) return
      setObstaculos(prev => {
        const jug = jugadoresRef.current
        const vivos = Object.values(jug).filter(j => j.vivo)


        const colisionados = new Set<number>()
        prev.forEach(o => {
          if (o.y > 72 && o.y < 88) {
            vivos.forEach(j => {
              if (j.carril === o.lane) colisionados.add(o.id)
            })
          }
        })


        if (colisionados.size > 0) {
          setJugadores(jugPrev => {
            const next = { ...jugPrev }
            Object.entries(next).forEach(([id, j]) => {
              if (!j.vivo) return

              const hit = prev.some(o => colisionados.has(o.id) && o.lane === j.carril)
              if (hit && j.vidas > 0) {
                const nuevasVidas = j.vidas - 1
                next[id] = { ...j, vidas: nuevasVidas, vivo: nuevasVidas > 0 }
              }
            })
            return next
          })
        }


        const esquivados = prev.filter(o => o.y >= 100 && !colisionados.has(o.id))
        if (esquivados.length > 0) {
          setJugadores(jugPrev => {
            const next = { ...jugPrev }
            Object.entries(next).forEach(([id, j]) => {
              if (j.vivo) next[id] = { ...j, puntos: j.puntos + esquivados.length * 100 }
            })
            return next
          })
        }

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
    if (a.vivo !== b.vivo) return a.vivo ? -1 : 1
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
          style={{
            gridTemplateColumns: `repeat(${Math.min(lista.length, 4)}, 1fr)`,
          }}
        >
          {listaOrdenada.map(([id, j]) => (
            <div
              key={id}
              className={`dodge-card ${!j.vivo ? 'dodge-card--dead' : ''}`}
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
                    style={{
                      left: `${laneX(o.lane)}%`,
                      top:  `${o.y}%`,
                    }}
                  />
                ))}

                <div
                  className={`dodge-player ${!j.vivo ? 'dodge-player--dead' : ''}`}
                  style={{
                    left:       `${laneX(j.carril)}%`,
                    background: j.vivo ? j.color : 'rgba(255,255,255,0.2)',
                  }}
                >
                  ▲
                </div>

                {!j.vivo && (
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
            <div className="dodge-results-list">
              {rankingRef.current.map((j, i) => (
                <div key={j.jugadorId} className="dodge-results-row" style={{ borderColor: j.color }}>
                  <span className="dodge-results-row__medal">{getMedal(i)}</span>
                  <span
                    className="dodge-results-row__dot"
                    style={{ background: j.color }}
                  />
                  <span className="dodge-results-row__name">{j.nombre}</span>
                  <span className="dodge-results-row__pts" style={{ color: j.color }}>
                    {j.puntos.toLocaleString()} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
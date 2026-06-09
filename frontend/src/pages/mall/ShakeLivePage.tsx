import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "../../hooks/useSocket";
import { useNavigate } from 'react-router-dom'
import MallHeader from '../../components/MallHeader'

interface JugadorScore {
  nombre: string;
  color: string;
  puntos: number;
}

const DOT_DIAMETER_PX = 22
const DOT_RADIUS_PX   = DOT_DIAMETER_PX / 2
const MIN_DIST_PX     = DOT_DIAMETER_PX + 2
const MAX_ATTEMPTS    = 150

interface BoardDot {
  id: string
  color: string
  x: number   
  y: number   
}


function findFreePosition(
  existing: BoardDot[],
  boardW: number,
  boardH: number,
): { x: number; y: number } | null {
  const margin = DOT_RADIUS_PX + 1
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const x = margin + Math.random() * (boardW - margin * 2)
    const y = margin + Math.random() * (boardH - margin * 2)
    const overlaps = existing.some(d => {
      const dx = d.x - x
      const dy = d.y - y
      return Math.sqrt(dx * dx + dy * dy) < MIN_DIST_PX
    })
    if (!overlaps) return { x, y }
  }
  return null
}

export default function ShakeLivePage() {
  const socket   = useSocket()
  const navigate = useNavigate()

  
  const [scores,    setScores]    = useState<Record<string, JugadorScore>>({})
  const [dots,      setDots]      = useState<BoardDot[]>([])
  const [countdown, setCountdown] = useState<number | null>(null)

  const scoresRef      = useRef<Record<string, JugadorScore>>({})
  const dotsRef        = useRef<BoardDot[]>([])
  const boardRef       = useRef<HTMLDivElement>(null)
  const rankingRef     = useRef<any[]>([])


  useEffect(() => { scoresRef.current = scores }, [scores])
  useEffect(() => { dotsRef.current   = dots   }, [dots])

  const addDot = useCallback((color: string) => {
    const board  = boardRef.current
    const boardW = board?.clientWidth  ?? 800
    const boardH = board?.clientHeight ?? 260

    const pos = findFreePosition(dotsRef.current, boardW, boardH)
    if (!pos) return 

    const newDot: BoardDot = {
      id:    `${color}-${Date.now()}-${Math.random()}`,
      color,
      x: pos.x,
      y: pos.y,
    }
    setDots(prev => {
      const next = [...prev, newDot]
      dotsRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    const emitJoin = () => {
      socket.emit('join-sala', {
        salaId: 'sala-001',
        jugador: { id: 'mall-screen', nombre: 'Mall' }
      })
    }
    if (socket.connected) emitJoin()
    else socket.on('connect', emitJoin)

    socket.on("players-update", (jugadores: any[]) => {
      setScores(prev => {
        const next: Record<string, JugadorScore> = {}
        jugadores.forEach(j => {
          if (j.id === 'mall-screen') return
          next[j.id] = {
            nombre: j.nombre || "Jugador",
            color:  j.color  || "#888",
            puntos: prev[j.id]?.puntos ?? 0,
          }
        })
        scoresRef.current = next
        return next
      })
    })

    socket.on("score-update", ({ jugadorId, fuerza }: { jugadorId: string; fuerza: number }) => {
      setScores(prev => {
        if (!prev[jugadorId]) return prev
        const nuevoPuntaje = (prev[jugadorId].puntos ?? 0) + Math.round(fuerza)
        const next = {
          ...prev,
          [jugadorId]: { ...prev[jugadorId], puntos: nuevoPuntaje }
        }
        scoresRef.current = next
        return next
      })

      const color = scoresRef.current[jugadorId]?.color ?? "#888"
      addDot(color)
    })

    socket.on("countdown", ({ count }: { count: number }) => setCountdown(count))

    socket.on("game-start", () => {
      setScores(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(id => {
          next[id] = { ...next[id], puntos: 0 }
        })
        scoresRef.current = next
        return next
      })
      setDots([])
      dotsRef.current = []
      setCountdown(null)
    })

    socket.on("player-finished", () => {
      setTimeout(() => navigate("/mall/results", { state: { ranking: rankingRef.current } }), 4000)
    })

    socket.on("ranking-partida", (ranking: any[]) => {
      if (ranking.length > 0) {
        rankingRef.current = ranking
      } else {
        setScores({})
        setDots([])
        dotsRef.current   = []
        scoresRef.current = {}
        rankingRef.current = []
        setCountdown(null)
      }
    })

    return () => {
      socket.off('connect', emitJoin)
      socket.off("players-update")
      socket.off("score-update")
      socket.off("countdown")
      socket.off("game-start")
      socket.off("player-finished")
      socket.off("ranking-partida")
    }
  }, [socket, navigate, addDot])

  const ordenados = Object.entries(scores)
    .filter(([id]) => id !== 'mall-screen')
    .sort(([, a], [, b]) => b.puntos - a.puntos)

  const getMedal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? ''

  return (
    <div className="mall-screen mall-shake">
      <div className="mall-pattern" aria-hidden />
      <MallHeader />

      <div className="mall-shake__top">
        <p className="mall-live-badge">¡JUEGO EN VIVO!</p>
        <span className="mall-mode-tag">SHAKE BATTLE</span>
      </div>

      {countdown !== null && countdown > 0 && (
        <div style={{ textAlign: 'center', fontSize: '1.4rem', color: '#a855f7', marginBottom: '0.5rem' }}>
          El juego empieza en {countdown}s
        </div>
      )}

      <div className="mall-shake__layout">
        <aside>
          {ordenados.slice(1, 3).map(([id, j], i) => (
            <div key={id} className="mall-leader-card" style={{ borderColor: j.color }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: j.color, display: 'inline-block' }} />
                <p className="mall-leader-card__name">{j.nombre}</p>
              </div>
              <p className="mall-leader-card__pts">{j.puntos.toLocaleString()} pts</p>
              <p className="mall-leader-card__rank">{getMedal(i + 1)} {i === 0 ? '2do lugar' : '3er lugar'}</p>
            </div>
          ))}
        </aside>

        <div style={{ flex: 1 }}>
          <div className="mall-board" ref={boardRef} aria-hidden>
            {dots.map((dot) => (
              <span
                key={dot.id}
                className="mall-board__dot mall-board__dot--filled"
                style={{
                  position:   'absolute',
                  left:       `${dot.x}px`,
                  top:        `${dot.y}px`,
                  background: dot.color,
                  transform:  'translate(-50%, -50%)',
                }}
              />
            ))}
          </div>

          {ordenados.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {ordenados.slice(0, 3).map(([id, j], i) => (
                <div key={id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.05)', borderRadius: 8,
                  padding: '6px 14px', border: `1px solid ${j.color}`,
                }}>
                  <span>{getMedal(i)}</span>
                  <span style={{ color: j.color, fontWeight: 'bold', fontSize: '0.9rem' }}>{j.nombre}</span>
                  <span style={{ color: '#ccc', fontSize: '0.85rem' }}>{j.puntos.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          )}

          <div className="mall-shake__hint-box" style={{ marginTop: '0.75rem' }}>
            ¡agita tu celular más fuerte!
          </div>
        </div>

        <aside>
          {ordenados[0] && (() => {
            const [id, j] = ordenados[0]
            return (
              <div key={id} className="mall-leader-card" style={{ borderColor: j.color }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: j.color, display: 'inline-block' }} />
                  <p className="mall-leader-card__name">{j.nombre}</p>
                </div>
                <p className="mall-leader-card__pts">{j.puntos.toLocaleString()} pts</p>
                <p className="mall-leader-card__rank">🥇 1er lugar</p>
              </div>
            )
          })()}
        </aside>
      </div>
    </div>
  )
}
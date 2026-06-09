import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "../../hooks/useSocket";
import { useNavigate } from 'react-router-dom'
import MallHeader from '../../components/MallHeader'

interface JugadorScore {
  nombre: string;
  color: string;
  puntos: number;
}

const DOT_SIZE_PX        = 24
const DOT_RADIUS_PX      = DOT_SIZE_PX / 2
const MIN_DIST_PX        = DOT_SIZE_PX + 4
const MAX_DOTS_PER_EVENT = 5
const MAX_BOARD_DOTS     = 400

interface BoardDot {
  id: string
  color: string
  x: number
  y: number
}

function getOccupiedCells(dots: BoardDot[], margin: number, cellSize: number): Set<string> {
  const occupied = new Set<string>()
  for (const d of dots) {
    const col = Math.floor((d.x - margin) / cellSize)
    const row = Math.floor((d.y - margin) / cellSize)
    occupied.add(`${col},${row}`)
  }
  return occupied
}

function findFreePosition(
  existing: BoardDot[],
  boardW: number,
  boardH: number,
): { x: number; y: number } | null {
  const margin = DOT_RADIUS_PX + 4
  const cellSize = MIN_DIST_PX
  const cols = Math.floor((boardW - margin * 2) / cellSize)
  const rows = Math.floor((boardH - margin * 2) / cellSize)

  if (cols < 1 || rows < 1) return null

  const occupied = getOccupiedCells(existing, margin, cellSize)
  const freeCells: { col: number; row: number }[] = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!occupied.has(`${col},${row}`)) {
        freeCells.push({ col, row })
      }
    }
  }

  if (freeCells.length === 0) return null

  const pick = freeCells[Math.floor(Math.random() * freeCells.length)]
  return {
    x: margin + pick.col * cellSize + cellSize / 2,
    y: margin + pick.row * cellSize + cellSize / 2,
  }
}

function dotsForForce(fuerza: number): number {
  return Math.max(1, Math.min(MAX_DOTS_PER_EVENT, Math.round(Math.abs(fuerza) / 6)))
}

const PLAYER_COLORS = [
  "#FF3366", 
  "#33FF99", 
  "#3366FF", 
  "#FFCC33", 
  "#9933FF", 
  "#FF9933", 
  "#33FFFF", 
  "#FF5050", 
  "#66FF33", 
  "#CC33FF", 
  "#00CCFF", 
  "#FF99CC" 
]

function getPlayerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length]
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

  const resetLiveState = useCallback(() => {
    setScores({})
    setDots([])
    setCountdown(null)
    dotsRef.current = []
    scoresRef.current = {}
    rankingRef.current = []
  }, [])

  const addDots = useCallback((color: string, amount: number) => {
    if (amount <= 0) return
    const board  = boardRef.current
    const boardW = board?.clientWidth  ?? 800
    const boardH = board?.clientHeight ?? 260

    setDots(prev => {
      const next = [...prev]
      for (let i = 0; i < amount; i++) {
        const pos = findFreePosition(next, boardW, boardH)
        if (!pos) continue
        next.push({
          id: `${color}-${Date.now()}-${Math.random()}-${i}`,
          color,
          x: pos.x,
          y: pos.y,
        })
      }
      const trimmed = next.length > MAX_BOARD_DOTS ? next.slice(next.length - MAX_BOARD_DOTS) : next
      dotsRef.current = trimmed
      return trimmed
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
        let playerIndex = 0
        jugadores.forEach((j) => {
          if (j.id === 'mall-screen' || j.id === 'admin-panel') return
          next[j.id] = {
            nombre: j.nombre || "Jugador",
            color:  j.color || prev[j.id]?.color || getPlayerColor(playerIndex),
            puntos: prev[j.id]?.puntos ?? 0,
          }
          playerIndex += 1
        })
        scoresRef.current = next
        return next
      })
    })

    socket.on("score-update", ({ jugadorId, fuerza }: { jugadorId: string; fuerza: number }) => {
      const color = scoresRef.current[jugadorId]?.color || "#ffffff"
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

      addDots(color, dotsForForce(fuerza))
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
      rankingRef.current = []
      setCountdown(null)
    })

    socket.on("partida-finalizada", ({ ranking }: { ranking: any[] }) => {
      if (ranking?.length) rankingRef.current = ranking
      setTimeout(() => navigate("/mall/results", { state: { ranking: rankingRef.current } }), 4000)
    })

    socket.on("ranking-partida", (ranking: any[]) => {
      if (ranking.length > 0) {
        rankingRef.current = ranking
      } else {
        resetLiveState()
      }
    })

    socket.on("round-reset", () => {
      resetLiveState()
      navigate('/mall/waiting')
    })

    return () => {
      socket.off('connect', emitJoin)
      socket.off("players-update")
      socket.off("score-update")
      socket.off("countdown")
      socket.off("game-start")
      socket.off("partida-finalizada")
      socket.off("ranking-partida")
      socket.off("round-reset")
    }
  }, [socket, navigate, addDots, resetLiveState])

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
                  '--dot-color': dot.color,
                  transform:  'translate(-50%, -50%)',
                } as React.CSSProperties}
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

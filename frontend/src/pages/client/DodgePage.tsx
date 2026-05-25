import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'
import SnapHeader from '../../components/SnapHeader'
import { API_BASE } from '../../config/api'

const DURACION = 30
const LANES = 4
const PLAYER_ROW = 82
const HIT_ROW = 72
const SPAWN_MS = 900
const TICK_MS = 32

type Obstacle = { id: number; lane: number; y: number }

function laneToPercent(lane: number) {
  return ((lane + 0.5) / LANES) * 100
}

export default function DodgePage() {
  const navigate = useNavigate()
  const socket = useSocket()
  const terminadoRef = useRef(false)
  const invencibleRef = useRef(false)
  const [parpadeo, setParpadeo] = useState(false)
  const idRef = useRef(0)
  const carrilRef = useRef(1)
  const obstaculosRef = useRef<Obstacle[]>([])
  const puntosRef = useRef(0)
  const vidasRef = useRef(3)

  const [carril, setCarril] = useState(1)
  const [obstaculos, setObstaculos] = useState<Obstacle[]>([])
  const [segundos, setSegundos] = useState(DURACION)
  const [vidas, setVidas] = useState(3)
  const [puntos, setPuntos] = useState(0)

  const jugadorId = localStorage.getItem('jugadorId') ?? 'sin-id'
  const salaId = localStorage.getItem('salaId') ?? 'sala-001'

  const emitPosicion = useCallback(
    (lane: number) => {
      const pos = laneToPercent(lane)
      socket.emit('dodge-data', { salaId, jugadorId, carril: lane, posicion: pos, angulo: 0 })
    },
    [socket, salaId, jugadorId]
  )

  const setCarrilSeguro = useCallback(
    (lane: number) => {
      const l = Math.min(LANES - 1, Math.max(0, lane))
      carrilRef.current = l
      setCarril(l)
      emitPosicion(l)
    },
    [emitPosicion]
  )

  const terminar = useCallback(async () => {
    if (terminadoRef.current) return
    terminadoRef.current = true
    const pts = puntosRef.current
    await fetch(`${API_BASE}/scores/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugadorId, salaId, juego: 'dodge', puntos: pts }),
    })
    socket.emit('game-over', { salaId, jugadorId, puntos: pts })
    navigate('/result')
  }, [jugadorId, salaId, socket, navigate])

  const perderVida = useCallback(() => {
    if (invencibleRef.current || terminadoRef.current) return
    invencibleRef.current = true
    setParpadeo(true)
    vidasRef.current -= 1
    setVidas(vidasRef.current)
    setTimeout(() => {
      invencibleRef.current = false
      setParpadeo(false)
    }, 1200)
    if (vidasRef.current <= 0) {
      setTimeout(() => terminar(), 400)
    }
  }, [terminar])

  
  useEffect(() => {
    const spawn = setInterval(() => {
      if (terminadoRef.current) return
      const obs: Obstacle = {
        id: idRef.current++,
        lane: Math.floor(Math.random() * LANES),
        y: -12,
      }
      obstaculosRef.current = [...obstaculosRef.current, obs]
    }, SPAWN_MS)

    const tick = setInterval(() => {
      if (terminadoRef.current) return

      let hit = false
      const next: Obstacle[] = []

      for (const o of obstaculosRef.current) {
        const y = o.y + 2.8
        if (y > 105) continue

        if (!hit && o.lane === carrilRef.current && y >= HIT_ROW && y <= PLAYER_ROW + 8) {
          hit = true
          perderVida()
          continue
        }
        next.push({ ...o, y })
      }

      obstaculosRef.current = next
      setObstaculos([...next])

      puntosRef.current += 2
      setPuntos(puntosRef.current)
    }, TICK_MS)

    return () => {
      clearInterval(spawn)
      clearInterval(tick)
    }
  }, [perderVida, terminar])

  
  useEffect(() => {
    const intervalo = setInterval(() => {
      setSegundos((prev) => {
        if (prev <= 1) {
          clearInterval(intervalo)
          terminar()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalo)
  }, [terminar])

  
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0
      if (gamma < -12) setCarrilSeguro(carrilRef.current - 1)
      else if (gamma > 12) setCarrilSeguro(carrilRef.current + 1)
    }
    window.addEventListener('deviceorientation', handler)
    return () => window.removeEventListener('deviceorientation', handler)
  }, [setCarrilSeguro])

  useEffect(() => {
    let startX = 0
    const onStart = (x: number) => {
      startX = x
    }
    const onEnd = (x: number) => {
      const dx = x - startX
      if (dx > 40) setCarrilSeguro(carrilRef.current + 1)
      else if (dx < -40) setCarrilSeguro(carrilRef.current - 1)
    }

    const arena = document.getElementById('dodge-arena-touch')
    if (!arena) return

    const ts = (e: TouchEvent) => onStart(e.changedTouches[0].clientX)
    const te = (e: TouchEvent) => onEnd(e.changedTouches[0].clientX)
    arena.addEventListener('touchstart', ts, { passive: true })
    arena.addEventListener('touchend', te, { passive: true })
    return () => {
      arena.removeEventListener('touchstart', ts)
      arena.removeEventListener('touchend', te)
    }
  }, [setCarrilSeguro])

  useEffect(() => {
    emitPosicion(carrilRef.current)
  }, [emitPosicion])

  const timerClass =
    segundos > 15 ? 'dodge-timer--ok' : segundos > 5 ? 'dodge-timer--warn' : 'dodge-timer--danger'

  return (
    <div className="snap-screen dodge-game">
      <div className="snap-pattern" aria-hidden />
      <SnapHeader compact />
      <main className="snap-content">
        <p className="dodge-game__mode">DODGE GAME</p>
        <p className={`dodge-timer ${timerClass}`}>{segundos}s</p>

        <div className="dodge-stats">
          <div>
            <p className="dodge-stats__label">Vidas</p>
            <p className="dodge-stats__hearts">
              {'❤️'.repeat(vidas)}
              {'🖤'.repeat(Math.max(0, 3 - vidas))}
            </p>
          </div>
          <div className="dodge-stats__right">
            <p className="dodge-stats__label">Puntuación</p>
            <p className="dodge-stats__score">{puntos.toLocaleString()}</p>
          </div>
        </div>

        <div id="dodge-arena-touch" className="dodge-arena dodge-arena--play">
          <div className="dodge-arena__lanes" aria-hidden>
            {Array.from({ length: LANES }, (_, i) => (
              <span key={i} className={i === carril ? 'dodge-lane--active' : ''} />
            ))}
          </div>

          {obstaculos.map((o) => (
            <div
              key={o.id}
              className="dodge-obstacle-fall"
              style={{
                left: `${laneToPercent(o.lane)}%`,
                top: `${o.y}%`,
              }}
              aria-hidden
            />
          ))}

          <div
            className={`dodge-player-arrow ${parpadeo ? 'dodge-player--blink' : ''}`}
            style={{ left: `${laneToPercent(carril)}%` }}
          >
            ▲
          </div>
        </div>

        <div className="dodge-controls">
          <button type="button" aria-label="Izquierda" onClick={() => setCarrilSeguro(carril - 1)}>
            ◀
          </button>
          <button type="button" aria-label="Derecha" onClick={() => setCarrilSeguro(carril + 1)}>
            ▶
          </button>
        </div>

        <p className="dodge-hint">Desliza, inclina el celular o usa ◀ ▶</p>
      </main>
    </div>
  )
}

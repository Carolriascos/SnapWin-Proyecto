import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'
import SnapHeader from '../../components/SnapHeader'
import { API_BASE } from '../../config/api'
import {
  createTiltSensor,
  getSensorCapabilities,
  getSensorStatusMessage,
  type SensorStatus,
} from '../../utils/tiltSensor'
import { rejoinOnResume } from '../../utils/sessionRejoin'
import { getGameMode } from '../../utils/gameMode'

const DURACION   = 30
const LANES      = 4
const PLAYER_ROW = 82
const HIT_ROW    = 72
const SPAWN_MS   = 900
const TICK_MS    = 32

type Obstacle = { id: number; lane: number; y: number }

function laneToPercent(lane: number) { return ((lane + 0.5) / LANES) * 100 }

export default function DodgePage() {
  const navigate = useNavigate()
  const socket   = useSocket()

  const terminadoRef   = useRef(false)
  const invencibleRef  = useRef(false)
  const idRef          = useRef(0)
  const carrilRef      = useRef(1)
  const obstaculosRef  = useRef<Obstacle[]>([])
  const puntosRef      = useRef(0)
  const vidasRef       = useRef(3)
  const gameEndAtRef   = useRef(Date.now() + DURACION * 1000)
  const pausedRef      = useRef(false)
  const sensorRef        = useRef<ReturnType<typeof createTiltSensor> | null>(null)
  const sensorActiveRef  = useRef(false)
  const sensorCaps       = getSensorCapabilities()

  const [carril,       setCarril]       = useState(1)
  const [obstaculos,   setObstaculos]   = useState<Obstacle[]>([])
  const [segundos,     setSegundos]     = useState(DURACION)
  const [vidas,        setVidas]        = useState(3)
  const [puntos,       setPuntos]       = useState(0)
  const [parpadeo,     setParpadeo]     = useState(false)
  const [sensorStatus, setSensorStatus] = useState<SensorStatus>(
    sensorCaps.requiresUserGesture ? 'pending_permission' : 'idle',
  )

  const jugadorId = localStorage.getItem('jugadorId') ?? 'sin-id'
  const salaId    = localStorage.getItem('salaId')    ?? 'sala-001'
  const nombre    = localStorage.getItem('nombre')    ?? 'Jugador'
  const color     = localStorage.getItem('color')     ?? '#7c3aed'

  const joinData = { salaId, jugador: { id: jugadorId, nombre, color, gameMode: getGameMode() } }

  const emitSync = useCallback(() => {
    const lane = carrilRef.current
    socket.emit('dodge-data', { salaId, jugadorId, carril: lane, posicion: laneToPercent(lane), angulo: 0 })
    socket.emit('dodge-sync', {
      salaId, jugadorId,
      carril: lane,
      vidas: vidasRef.current,
      puntos: puntosRef.current,
      eliminado: vidasRef.current <= 0,
      obstaculos: obstaculosRef.current.map(o => ({ id: o.id, lane: o.lane, y: o.y })),
    })
  }, [socket, salaId, jugadorId])

  const setCarrilSeguro = useCallback((lane: number) => {
    const l = Math.min(LANES - 1, Math.max(0, lane))
    carrilRef.current = l
    setCarril(l)
    emitSync()
  }, [emitSync])

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
    emitSync()
    setTimeout(() => { invencibleRef.current = false; setParpadeo(false) }, 1200)
    if (vidasRef.current <= 0) setTimeout(() => terminar(), 400)
  }, [terminar, emitSync])

  const startSensors = useCallback(async () => {
    sensorRef.current?.stop()
    sensorActiveRef.current = false

    const sensor = createTiltSensor({
      onTilt: (dir) => setCarrilSeguro(carrilRef.current + dir),
      onStatus: (status) => {
        setSensorStatus(status)
        sensorActiveRef.current = status === 'active'
      },
    })
    sensorRef.current = sensor
    await sensor.start()
  }, [setCarrilSeguro])

  useEffect(() => {
    if (!sensorCaps.requiresUserGesture) startSensors()
    return () => sensorRef.current?.stop()
  }, [startSensors])

  useEffect(() => {
    const spawn = setInterval(() => {
      if (terminadoRef.current || pausedRef.current || document.hidden) return
      const obs: Obstacle = { id: idRef.current++, lane: Math.floor(Math.random() * LANES), y: -12 }
      obstaculosRef.current = [...obstaculosRef.current, obs]
    }, SPAWN_MS)

    const tick = setInterval(() => {
      if (terminadoRef.current || pausedRef.current || document.hidden) return
      let hit = false
      const next: Obstacle[] = []
      for (const o of obstaculosRef.current) {
        const y = o.y + 2.8
        if (y > 105) continue
        if (!hit && o.lane === carrilRef.current && y >= HIT_ROW && y <= PLAYER_ROW + 8) {
          hit = true; perderVida(); continue
        }
        next.push({ ...o, y })
      }
      obstaculosRef.current = next
      setObstaculos([...next])
      puntosRef.current += 2
      setPuntos(puntosRef.current)
      emitSync()
    }, TICK_MS)

    return () => { clearInterval(spawn); clearInterval(tick) }
  }, [perderVida, emitSync])

  useEffect(() => {
    const intervalo = setInterval(() => {
      if (pausedRef.current || document.hidden) return
      const restante = Math.max(0, Math.ceil((gameEndAtRef.current - Date.now()) / 1000))
      setSegundos(restante)
      if (restante <= 0) { clearInterval(intervalo); terminar() }
    }, 250)
    return () => clearInterval(intervalo)
  }, [terminar])

  useEffect(() => {
    let startX = 0
    const arena = document.getElementById('dodge-arena-touch')
    if (!arena) return
    const ts = (e: TouchEvent) => { startX = e.changedTouches[0].clientX }
    const te = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX
      if (dx > 40)       setCarrilSeguro(carrilRef.current + 1)
      else if (dx < -40) setCarrilSeguro(carrilRef.current - 1)
    }
    arena.addEventListener('touchstart', ts, { passive: true })
    arena.addEventListener('touchend',   te, { passive: true })
    return () => { arena.removeEventListener('touchstart', ts); arena.removeEventListener('touchend', te) }
  }, [setCarrilSeguro])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        pausedRef.current = true
      } else if (!terminadoRef.current) {
        pausedRef.current = false
        const restante = Math.max(0, Math.ceil((gameEndAtRef.current - Date.now()) / 1000))
        setSegundos(restante)
        emitSync()
        if (sensorActiveRef.current || !sensorCaps.requiresUserGesture) {
          startSensors()
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onVisibility)
    }
  }, [emitSync, startSensors])

  useEffect(() => {
    socket.emit('join-sala', joinData)
    const cleanup = rejoinOnResume(socket, joinData)
    return cleanup
  }, [socket])

  useEffect(() => { emitSync() }, [emitSync])

  const eliminado   = vidas <= 0
  const timerClass  = segundos > 15 ? 'dodge-timer--ok' : segundos > 5 ? 'dodge-timer--warn' : 'dodge-timer--danger'

  return (
    <div className="snap-screen dodge-game">
      <div className="snap-pattern" aria-hidden />
      <SnapHeader compact />
      <main className="snap-content">
        <p className="dodge-game__mode">DODGE GAME</p>
        <p className={`dodge-timer ${timerClass}`}>{segundos}s</p>

        {sensorStatus === 'pending_permission' && (
          <button
            type="button"
            className="btn-primary"
            style={{ marginBottom: '0.5rem', fontSize: '0.85rem', padding: '10px 16px' }}
            onClick={() => startSensors()}
          >
            Activar control por inclinación
          </button>
        )}

        {getSensorStatusMessage(sensorStatus) && sensorStatus !== 'pending_permission' && (
          <p style={{ color: '#ff8c1a', fontSize: '0.8rem', textAlign: 'center', marginBottom: '0.4rem' }}>
            {getSensorStatusMessage(sensorStatus)}
          </p>
        )}

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

          {obstaculos.map(o => (
            <div
              key={o.id}
              className="dodge-obstacle-fall"
              style={{ left: `${laneToPercent(o.lane)}%`, top: `${o.y}%` }}
              aria-hidden
            />
          ))}

          <div
            className={`dodge-player-arrow ${parpadeo ? 'dodge-player--blink' : ''} ${eliminado ? 'dodge-player--dead' : ''}`}
            style={{ left: `${laneToPercent(carril)}%` }}
          >▲</div>

          {eliminado && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', zIndex: 10, borderRadius: 'inherit' }}>
              <span style={{ fontSize: '2rem' }}>💀</span>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', margin: '0.25rem 0 0' }}>ELIMINADO</p>
            </div>
          )}
        </div>

        <div className="dodge-controls">
          <button type="button" aria-label="Izquierda" onClick={() => setCarrilSeguro(carril - 1)}>◀</button>
          <button type="button" aria-label="Derecha"   onClick={() => setCarrilSeguro(carril + 1)}>▶</button>
        </div>

        <p className="dodge-hint">Desliza, inclina el celular o usa ◀ ▶</p>
      </main>
    </div>
  )
}

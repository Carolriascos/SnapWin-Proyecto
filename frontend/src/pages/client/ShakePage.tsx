import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'
import SnapHeader from '../../components/SnapHeader'
import { API_BASE } from '../../config/api'
import { rejoinOnResume } from '../../utils/sessionRejoin'
import { getGameMode } from '../../utils/gameMode'

const DURACION = 30

const MAX_FUERZA     = 30

const DECAY_FACTOR   = 0.88   
const DECAY_INTERVAL = 50     

export default function ShakePage() {
  const navigate     = useNavigate()
  const socket       = useSocket()
  const puntosRef      = useRef(0)
  const terminadoRef   = useRef(false)
  const gameEndAtRef   = useRef(Date.now() + DURACION * 1000)
  const pausedRef      = useRef(false)

  const [puntos,       setPuntos]       = useState(0)
  const [segundos,     setSegundos]     = useState(DURACION)
  const [puesto,       setPuesto]       = useState<string | null>(null)
  
  const [intensityPct, setIntensityPct] = useState(0)

  const intensityRef   = useRef(0)   
  const allScoresRef   = useRef<Record<string, number>>({})

  const jugadorId = localStorage.getItem('jugadorId') ?? 'sin-id'
  const salaId    = localStorage.getItem('salaId')    ?? 'sala-001'
  const nombre    = localStorage.getItem('nombre')    ?? 'Jugador'
  const color     = localStorage.getItem('color')     ?? '#7c3aed'
  const joinData  = { salaId, jugador: { id: jugadorId, nombre, color, gameMode: getGameMode() } }

  
  const actualizarPuesto = useCallback(() => {
    const scores    = allScoresRef.current
    const miPuntos  = scores[jugadorId] ?? 0
    const ordenados = Object.entries(scores)
      .filter(([id]) => id !== jugadorId)
      .map(([, pts]) => pts)
      .sort((a, b) => b - a)

    const pos = ordenados.filter(pts => pts > miPuntos).length + 1

    if (pos === 1)      setPuesto('🥇 Vas en 1er lugar')
    else if (pos === 2) setPuesto('🥈 Vas en 2do lugar')
    else if (pos === 3) setPuesto('🥉 Vas en 3er lugar')
    else {
      const tercerPuesto = ordenados[1] ?? 0
      const faltaron     = Math.max(0, tercerPuesto - miPuntos + 1)
      setPuesto(`😅 No estás en el top 3 — te faltaron ${faltaron.toLocaleString()} pts`)
    }
  }, [jugadorId])

  
  const agregarPuntos = useCallback((fuerza: number) => {
    if (terminadoRef.current) return
    const sumado = Math.round(fuerza)
    puntosRef.current += sumado
    setPuntos(puntosRef.current)
    allScoresRef.current[jugadorId] = puntosRef.current
    socket.emit('shake-data', { salaId, jugadorId, fuerza })
    actualizarPuesto()

    
    const pct = Math.min(100, Math.round((fuerza / MAX_FUERZA) * 100))
    
    if (pct > intensityRef.current) {
      intensityRef.current = pct
      setIntensityPct(pct)
    }
  }, [socket, salaId, jugadorId, actualizarPuesto])

  
  useEffect(() => {
    const id = setInterval(() => {
      if (intensityRef.current <= 0) return
      intensityRef.current = intensityRef.current * DECAY_FACTOR
      if (intensityRef.current < 0.5) intensityRef.current = 0
      setIntensityPct(Math.round(intensityRef.current))
    }, DECAY_INTERVAL)
    return () => clearInterval(id)
  }, [])

  
  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => {
      if (pausedRef.current || document.hidden || terminadoRef.current) return
      const acc = e.accelerationIncludingGravity ?? e.acceleration
      if (!acc) return
      const f = Math.sqrt((acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2)
      if (f > 2) {
        
        const pct = Math.min(100, Math.round((f / MAX_FUERZA) * 100))
        if (pct > intensityRef.current) {
          intensityRef.current = pct
          setIntensityPct(pct)
        }
      }
      if (f > 15) agregarPuntos(f)
    }
    window.addEventListener('devicemotion', handler)
    return () => window.removeEventListener('devicemotion', handler)
  }, [agregarPuntos])

  
  useEffect(() => {
    socket.on('score-update', ({ jugadorId: jId, fuerza }: { jugadorId: string; fuerza: number }) => {
      allScoresRef.current[jId] = (allScoresRef.current[jId] ?? 0) + Math.round(fuerza)
      actualizarPuesto()
    })
    return () => { socket.off('score-update') }
  }, [socket, actualizarPuesto])

  
  useEffect(() => {
    const intervalo = setInterval(() => {
      if (pausedRef.current || document.hidden) return
      const restante = Math.max(0, Math.ceil((gameEndAtRef.current - Date.now()) / 1000))
      setSegundos(restante)
      if (restante <= 0) { clearInterval(intervalo); terminar() }
    }, 250)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        pausedRef.current = true
      } else if (!terminadoRef.current) {
        pausedRef.current = false
        const restante = Math.max(0, Math.ceil((gameEndAtRef.current - Date.now()) / 1000))
        setSegundos(restante)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onVisibility)
    }
  }, [])

  useEffect(() => {
    const cleanup = rejoinOnResume(socket, joinData)
    return cleanup
  }, [socket])

  const terminar = async () => {
    if (terminadoRef.current) return
    terminadoRef.current = true
    await fetch(`${API_BASE}/scores/save`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ jugadorId, salaId, juego: 'shake', puntos: puntosRef.current }),
    })
    socket.emit('game-over', { salaId, jugadorId, puntos: puntosRef.current })
    navigate('/result')
  }

  const timerClass =
    segundos > 15 ? 'shake-timer-pill--ok'
    : segundos > 5 ? 'shake-timer-pill--warn'
    : ''
  const barColor =
    intensityPct >= 80 ? '#ff4444'       
    : intensityPct >= 50 ? '#ff8c1a'     
    : intensityPct >= 25 ? '#a4ff00'      
    : 'var(--snap-purple)'                

  return (
    <div className="snap-screen shake-screen">
      <div className="snap-pattern" aria-hidden />
      <SnapHeader compact />
      <main className="snap-content">
        <div className={`shake-timer-pill ${timerClass}`}>
          <span aria-hidden>⏱</span>
          <span>{String(segundos).padStart(2, '0')}s</span>
        </div>

        <div className="shake-score-card">
          <p className="shake-score-card__label">Tu puntuación</p>
          <p className="shake-score-card__value">{puntos.toLocaleString()}</p>
          {puesto && (
            <p style={{ fontSize: '0.95rem', fontWeight: 'bold', marginTop: '0.4rem', color: '#a855f7', textAlign: 'center', padding: '0 1rem' }}>
              {puesto}
            </p>
          )}
          <p className="shake-score-card__sub">Puntuación acumulada</p>
        </div>

        <div className="shake-action-box">
          <div className="shake-action-box__icon" aria-hidden>📱</div>
          <h1>¡Agita el celular!</h1>
          <p className="shake-action-box__hint">Agítalo con la mayor fuerza posible</p>
          <button
            type="button"
            className="shake-demo-btn"
            onClick={() => agregarPuntos(20 + Math.random() * 10)}
          >
            SHAKE! (demo)
          </button>
        </div>

        
        <div className="shake-intensity">
          <div className="shake-intensity__row">
            <span>INTENSIDAD</span>
            <span className="shake-intensity__pct" style={{ color: barColor }}>
              {intensityPct}%
            </span>
          </div>
          <div className="shake-intensity__bar">
            <div
              className="shake-intensity__fill"
              style={{
                width:      `${intensityPct}%`,
                background: barColor,
                
                transition: intensityPct > (intensityRef.current ?? 0)
                  ? 'width 0.05s ease, background 0.2s ease'
                  : 'width 0.08s ease, background 0.3s ease',
              }}
            />
          </div>
          
          <p className="shake-intensity__label">
            {intensityPct >= 80 ? '🔥 ¡MÁXIMA POTENCIA!'
            : intensityPct >= 50 ? '💪 ¡Muy bien, sigue!'
            : intensityPct >= 20 ? '👍 Buen ritmo'
            : intensityPct > 0  ? '📱 Agita más fuerte'
            : '⬆️ Empieza a agitar'}
          </p>
        </div>
      </main>
    </div>
  )
}
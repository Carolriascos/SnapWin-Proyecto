import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'
import SnapHeader from '../../components/SnapHeader'
import { API_BASE } from '../../config/api'
const DURACION = 30

export default function ShakePage() {
  const navigate     = useNavigate()
  const socket       = useSocket()
  const puntosRef    = useRef(0)
  const terminadoRef = useRef(false)
  const [puntos,   setPuntos]   = useState(0)
  const [segundos, setSegundos] = useState(DURACION)
  const jugadorId = localStorage.getItem('jugadorId') ?? 'sin-id'
  const salaId    = localStorage.getItem('salaId')    ?? 'sala-001'

  const agregarPuntos = (fuerza: number) => {
    if (terminadoRef.current) return
    puntosRef.current += Math.round(fuerza)
    setPuntos(puntosRef.current)
    socket.emit('shake-data', { salaId, jugadorId, fuerza })
  }

  // Sensor celular
  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => {
      const acc = e.acceleration
      if (!acc) return
      const f = Math.sqrt((acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2)
      if (f > 15) agregarPuntos(f)
    }
    window.addEventListener('devicemotion', handler)
    return () => window.removeEventListener('devicemotion', handler)
  }, [])

  
  useEffect(() => {
    const intervalo = setInterval(() => {
      setSegundos(prev => {
        if (prev <= 1) {
          clearInterval(intervalo)
          terminar()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalo)
  }, [])

  const terminar = async () => {
    if (terminadoRef.current) return
    terminadoRef.current = true
    await fetch(`${API_BASE}/scores/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugadorId, salaId, juego: 'shake', puntos: puntosRef.current })
    })
    socket.emit('game-over', { salaId, jugadorId, puntos: puntosRef.current })
    navigate('/result')
  }

  const timerClass =
    segundos > 15 ? 'shake-timer-pill--ok' : segundos > 5 ? 'shake-timer-pill--warn' : ''

  const intensityPct = Math.min(100, Math.round((puntos / 1500) * 100) || 0)

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
            <span>{intensityPct}%</span>
          </div>
          <div className="shake-intensity__bar">
            <div className="shake-intensity__fill" style={{ width: `${intensityPct}%` }} />
          </div>
        </div>
      </main>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? ''
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

  // Sensor real del celular
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

  // Timer de 30 segundos
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
    await fetch(`${BACKEND}/scores/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugadorId, salaId, juego: 'shake', puntos: puntosRef.current })
    })
    socket.emit('game-over', { salaId, jugadorId, puntos: puntosRef.current })
    navigate('/result')
  }

  // Esta línea faltaba — define el color según el tiempo restante
  const colorTimer = segundos > 15 ? 'green' : segundos > 5 ? 'orange' : 'red'

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>¡Agita el celular!</h1>

      <p style={{ fontSize: '3rem', fontWeight: 'bold', color: colorTimer, margin: '10px 0' }}>
        {segundos}s
      </p>

      <p style={{ fontSize: '2.5rem', margin: '10px 0' }}>
        {puntos} pts
      </p>

      <button
        style={{ fontSize: '1.5rem', padding: '24px 40px', marginTop: '20px', borderRadius: '12px' }}
        onClick={() => agregarPuntos(20 + Math.random() * 10)}
      >
        SHAKE! (demo)
      </button>
    </div>
  )
}
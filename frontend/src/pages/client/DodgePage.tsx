import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000'
const DURACION = 30

export default function DodgePage() {
  const navigate     = useNavigate()
  const socket       = useSocket()
  const terminadoRef = useRef(false)
  const posicionRef  = useRef(50) // posición horizontal 0-100%
  const [posicion, setPosicion]   = useState(50)
  const [segundos, setSegundos]   = useState(DURACION)
  const [vidas, setVidas]         = useState(3)
  const vidasRef = useRef(3)
  const jugadorId = localStorage.getItem('jugadorId') ?? 'sin-id'
  const salaId    = localStorage.getItem('salaId')    ?? 'sala-001'

  // Giroscopio real del celular
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const angulo = e.gamma ?? 0 // inclinación lateral: -90 a 90
      const nueva = Math.min(100, Math.max(0, posicionRef.current + angulo * 0.5))
      posicionRef.current = nueva
      setPosicion(nueva)
      socket.emit('dodge-data', { salaId, jugadorId, angulo })
    }
    window.addEventListener('deviceorientation', handler)
    return () => window.removeEventListener('deviceorientation', handler)
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
    const puntos = vidasRef.current * 100 + Math.floor(Math.random() * 50)
    await fetch(`${BACKEND}/scores/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugadorId, salaId, juego: 'dodge', puntos })
    })
    socket.emit('game-over', { salaId, jugadorId, puntos })
    navigate('/result')
  }

  // Mock — mover con botones para demo sin celular
  const moverIzquierda = () => {
    const nueva = Math.max(0, posicionRef.current - 15)
    posicionRef.current = nueva
    setPosicion(nueva)
    socket.emit('dodge-data', { salaId, jugadorId, angulo: -20 })
  }

  const moverDerecha = () => {
    const nueva = Math.min(100, posicionRef.current + 15)
    posicionRef.current = nueva
    setPosicion(nueva)
    socket.emit('dodge-data', { salaId, jugadorId, angulo: 20 })
  }

  const colorTimer = segundos > 15 ? 'green' : segundos > 5 ? 'orange' : 'red'

  return (
    <div style={{ textAlign: 'center', padding: '20px', userSelect: 'none' }}>
      <h1>¡Esquiva los objetos!</h1>

      <p style={{ fontSize: '3rem', fontWeight: 'bold', color: colorTimer }}>
        {segundos}s
      </p>

      <p style={{ fontSize: '1.5rem' }}>
        {'❤️'.repeat(vidas)}{'🖤'.repeat(3 - vidas)}
      </p>

      {/* Campo de juego */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '200px',
        background: '#1a1a2e',
        borderRadius: '12px',
        overflow: 'hidden',
        margin: '16px 0'
      }}>
        {/* Jugador */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: `calc(${posicion}% - 20px)`,
          width: '40px',
          height: '40px',
          background: '#7c3aed',
          borderRadius: '50%',
          transition: 'left 0.1s',
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          🧍
        </div>
      </div>

      {/* Controles demo para presentación */}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '16px' }}>
        <button
          style={{ fontSize: '2rem', padding: '16px 32px', borderRadius: '12px' }}
          onPointerDown={moverIzquierda}
        >
          ◀
        </button>
        <button
          style={{ fontSize: '2rem', padding: '16px 32px', borderRadius: '12px' }}
          onPointerDown={moverDerecha}
        >
          ▶
        </button>
      </div>

      <p style={{ color: '#888', marginTop: '12px', fontSize: '0.9rem' }}>
        Inclina el celular o usa los botones (demo)
      </p>
    </div>
  )
}
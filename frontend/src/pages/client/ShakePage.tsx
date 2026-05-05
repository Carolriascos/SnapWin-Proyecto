import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000'

/** Pantalla del juego activo — agitar el celular o usar botón para demo */
export default function ShakePage() {
  const navigate  = useNavigate()
  const socket    = useSocket()
  const puntosRef = useRef(0)
  const [puntos, setPuntos] = useState(0)
  const jugadorId = localStorage.getItem('jugadorId') ?? 'sin-id'
  const salaId    = localStorage.getItem('salaId')    ?? 'sala-001'

  const agregarPuntos = (fuerza: number) => {
    puntosRef.current += Math.round(fuerza)
    setPuntos(puntosRef.current)
    socket.emit('shake-data', { salaId, jugadorId, fuerza })
  }

  // Sensor real del celular
  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => {
      const acc = e.acceleration
      if (!acc) return
      const f = Math.sqrt((acc.x??0)**2 + (acc.y??0)**2 + (acc.z??0)**2)
      if (f > 15) agregarPuntos(f)
    }
    window.addEventListener('devicemotion', handler)
    return () => window.removeEventListener('devicemotion', handler)
  }, [])

  // Terminar juego y guardar score
  const terminar = async () => {
    await fetch(`${BACKEND}/scores/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugadorId, salaId, juego: 'shake', puntos: puntosRef.current })
    })
    socket.emit('game-over', { salaId, jugadorId, puntos: puntosRef.current })
    navigate('/result')
  }

  return (
    <div>
      <h1> ¡Agita el celular!</h1>
      <p style={{ fontSize: '2rem' }}>Puntos: {puntos}</p>
      <button style={{ fontSize: '1.5rem', padding: '20px' }}
        onClick={() => agregarPuntos(20 + Math.random() * 10)}>
         SHAKE! (demo)
      </button>
      <br/><br/>
      <button onClick={terminar}>Terminar juego</button>
    </div>
  )
}

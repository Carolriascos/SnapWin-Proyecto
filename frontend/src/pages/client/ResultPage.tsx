import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScoreEntry, Coupon } from '../../types'

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? ''

/** Pantalla de resultado — muestra top 3 y el cupón si ganó */
export default function ResultPage() {
  const navigate  = useNavigate()
  const [top3, setTop3]     = useState<ScoreEntry[]>([])
  const [cupon, setCupon]   = useState<Coupon | null>(null)
  const jugadorId = localStorage.getItem('jugadorId')
  const salaId    = localStorage.getItem('salaId') ?? 'sala-001'

  useEffect(() => {
    const cargar = async () => {
      const res  = await fetch(`${BACKEND}/scores/ranking/${salaId}`)
      const data = await res.json()
      if (!data.success) return
      setTop3(data.data)

      // Si el jugador está en top 3, generar cupón
      const posicion = data.data.findIndex((j: ScoreEntry) => j.jugador_id === jugadorId) + 1
      if (posicion >= 1 && posicion <= 3) {
        const r  = await fetch(`${BACKEND}/coupons/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jugadorId, posicion })
        })
        const cd = await r.json()
        if (cd.success) setCupon(cd.data)
      }
    }
    cargar()
  }, [jugadorId, salaId])

  const medallas = ['🥇', '🥈', '🥉']

  return (
    <div>
      <h1> Resultado final</h1>
      <h2>Top 3</h2>
      {top3.map((j, i) => (
        <p key={j.jugador_id}>{medallas[i]} {j.jugadores?.nombre ?? 'Jugador'} — {j.puntos} pts</p>
      ))}

      {cupon ? (
        <div>
          <h2>¡Ganaste un cupón!</h2>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{cupon.codigo}</p>
          <p>{cupon.descuento}% de descuento — Nivel {cupon.nivel}</p>
          <p>Muéstraselo al cajero</p>
        </div>
      ) : (
        <p> Esta vez no estás en el top 3</p>
      )}
      <br/>
      <button onClick={() => navigate('/')}>Jugar de nuevo</button>
    </div>
  )
}

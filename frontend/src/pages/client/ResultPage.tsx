import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import emailjs from '@emailjs/browser'
import { ScoreEntry, Coupon } from '../../types'
import SnapHeader from '../../components/SnapHeader'
import { API_BASE } from '../../config/api'

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

function enviarCuponPorCorreo(cupon: Coupon) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('EmailJS: faltan variables en frontend/.env')
    return
  }
  const correo = localStorage.getItem('correo') ?? ''
  if (!correo) {
    console.warn('EmailJS: no hay correo del jugador en localStorage')
    return
  }
  emailjs
    .send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: correo,
        nombre: localStorage.getItem('nombre') ?? 'Jugador',
        correo,
        codigo: cupon.codigo,
        nivel: cupon.nivel,
        descuento: String(cupon.descuento),
      },
      EMAILJS_PUBLIC_KEY
    )
    .catch(err => console.error('EmailJS error:', err))
}

/** Pantalla de resultado — muestra top 3 y el cupón si ganó */
export default function ResultPage() {
  const navigate  = useNavigate()
  const [top3, setTop3]     = useState<ScoreEntry[]>([])
  const [cupon, setCupon]   = useState<Coupon | null>(null)
  const jugadorId = localStorage.getItem('jugadorId')
  const salaId    = localStorage.getItem('salaId') ?? 'sala-001'

  useEffect(() => {
    const cargar = async () => {
      const res  = await fetch(`${API_BASE}/scores/ranking/${salaId}`)
      const data = await res.json()
      if (!data.success) return
      setTop3(data.data)

      // Si el jugador está en top 3, generar cupón
      const posicion = data.data.findIndex((j: ScoreEntry) => j.jugador_id === jugadorId) + 1
      if (posicion >= 1 && posicion <= 3) {
        const r  = await fetch(`${API_BASE}/coupons/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jugadorId, posicion })
        })
        const cd = await r.json()
        if (cd.success) {
          setCupon(cd.data)
          enviarCuponPorCorreo(cd.data)
        }
      }
    }
    cargar()
  }, [jugadorId, salaId])

  const medallas = ['🥇', '🥈', '🥉']
  const posicion = top3.findIndex(j => j.jugador_id === jugadorId) + 1
  const misPuntos = top3.find(j => j.jugador_id === jugadorId)?.puntos ?? 0
  const lugares = ['', 'PRIMER LUGAR', 'SEGUNDO LUGAR', 'TERCER LUGAR']

  return (
    <div className="snap-screen">
      <div className="snap-pattern snap-pattern--teal" aria-hidden />
      <SnapHeader compact />
      <main className="snap-content">
        {cupon ? (
          <>
            <div className="result-status result-status--win">
              <h2>¡Felicitaciones!</h2>
              <p className="result-place">{lugares[posicion] || 'TOP 3'}</p>
            </div>
            <div className="result-points">
              <p className="result-points__value">{misPuntos.toLocaleString()}</p>
              <p className="result-points__label">Puntos totales</p>
            </div>
            <div className="result-prize-card">
              <p className="result-prize-card__title">Tu premio</p>
              <p className="result-prize-card__discount">{cupon.descuento}% OFF</p>
              <p className="result-prize-card__meta">Nivel {cupon.nivel} — Muéstraselo al cajero</p>
              <span className="result-code">{cupon.codigo}</span>
            </div>
            <div className="result-email-box">
              Cupón enviado a
              <strong>{localStorage.getItem('correo') ?? 'tu correo'}</strong>
            </div>
          </>
        ) : (
          <>
            <div className="result-status result-status--lose">
              <h2>¡Casi lo logras!</h2>
              <p>Esta vez no estás en el top 3, ¡buen intento!</p>
            </div>
            <div className="result-points">
              <p className="result-points__value">{misPuntos.toLocaleString()}</p>
              <p className="result-points__label">Tus puntos</p>
            </div>
            <div className="result-miss-card">
              <p className="result-miss-card__title">Te faltó</p>
              <p className="result-miss-card__pts">—</p>
              <p className="result-miss-card__sub">Para alcanzar el tercer lugar</p>
            </div>
          </>
        )}

        <h2 className="snap-title snap-title--sm">Top 3</h2>
        <div className="result-ranking">
          {top3.map((j, i) => (
            <p key={j.jugador_id}>{medallas[i]} {j.jugadores?.nombre ?? 'Jugador'} — {j.puntos} pts</p>
          ))}
        </div>
      </main>
      <div className="snap-footer-actions">
        <button type="button" className="btn-primary" onClick={() => navigate('/final-round')}>
          Continuar
        </button>
      </div>
    </div>
  )
}

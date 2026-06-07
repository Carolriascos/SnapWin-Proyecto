import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import emailjs from '@emailjs/browser'
import { Coupon } from '../../types'
import SnapHeader from '../../components/SnapHeader'
import { API_BASE } from '../../config/api'
import { useSocket } from '../../hooks/useSocket'

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

interface JugadorRanking {
  jugadorId: string
  nombre: string
  puntos: number
  color?: string
}

function enviarCuponPorCorreo(cupon: Coupon) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) return
  const correo = localStorage.getItem('correo') ?? ''
  if (!correo) return
  emailjs.send(
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
  ).catch(err => console.error('EmailJS error:', err))
}

export default function ResultPage() {
  const navigate  = useNavigate()
  const socket    = useSocket()
  const [ranking, setRanking] = useState<JugadorRanking[]>([])
  const [cupon, setCupon]     = useState<Coupon | null>(null)
  const jugadorId = localStorage.getItem('jugadorId') ?? ''
  const salaId    = localStorage.getItem('salaId') ?? 'sala-001'

  useEffect(() => {
    // Escuchar ranking de la partida actual via socket
    socket.on('ranking-partida', (data: JugadorRanking[]) => {
      if (data.length === 0) return
      setRanking(data)

      // Generar cupón si está en top 3
      const posicion = data.findIndex(j => j.jugadorId === jugadorId) + 1
      if (posicion >= 1 && posicion <= 3 && !cupon) {
        fetch(`${API_BASE}/coupons/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jugadorId, posicion })
        })
          .then(r => r.json())
          .then(cd => {
            if (cd.success) {
              setCupon(cd.data)
              enviarCuponPorCorreo(cd.data)
            }
          })
      }
    })

    return () => { socket.off('ranking-partida') }
  }, [socket, jugadorId, salaId, cupon])

  const medallas = ['🥇', '🥈', '🥉']
  const posicion = ranking.findIndex(j => j.jugadorId === jugadorId) + 1
  const misPuntos = ranking.find(j => j.jugadorId === jugadorId)?.puntos ?? 0
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
              Cupón enviado a <strong>{localStorage.getItem('correo') ?? 'tu correo'}</strong>
            </div>
          </>
        ) : posicion > 3 ? (
          <>
            <div className="result-status result-status--lose">
              <h2>¡Casi lo logras!</h2>
              <p>Esta vez no estás en el top 3, ¡buen intento!</p>
            </div>
            <div className="result-points">
              <p className="result-points__value">{misPuntos.toLocaleString()}</p>
              <p className="result-points__label">Tus puntos</p>
            </div>
          </>
        ) : (
          <div className="result-status result-status--lose">
            <h2>Calculando resultado...</h2>
            <p>Espera un momento</p>
          </div>
        )}

        {ranking.length > 0 && (
          <>
            <h2 className="snap-title snap-title--sm">Top 3 — Esta partida</h2>
            <div className="result-ranking">
              {ranking.slice(0, 3).map((j, i) => (
                <p key={j.jugadorId}>
                  {medallas[i]} {j.nombre} — {j.puntos.toLocaleString()} pts
                </p>
              ))}
            </div>
          </>
        )}
      </main>
      <div className="snap-footer-actions">
        <button type="button" className="btn-primary" onClick={() => navigate('/final-round')}>
          Continuar
        </button>
      </div>
    </div>
  )
}
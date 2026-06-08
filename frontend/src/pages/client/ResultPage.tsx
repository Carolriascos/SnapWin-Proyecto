import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import emailjs from '@emailjs/browser'
import { Coupon } from '../../types'
import SnapHeader from '../../components/SnapHeader'
import { API_BASE } from '../../config/api'
import { useSocket } from '../../hooks/useSocket'

const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

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
    EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID,
    { to_email: correo, nombre: localStorage.getItem('nombre') ?? 'Jugador',
      correo, codigo: cupon.codigo, nivel: cupon.nivel, descuento: String(cupon.descuento) },
    EMAILJS_PUBLIC_KEY
  ).catch(err => console.error('EmailJS error:', err))
}

export default function ResultPage() {
  const navigate = useNavigate()
  const socket   = useSocket()

  const [ranking,    setRanking]    = useState<JugadorRanking[]>([])
  const [cupon,      setCupon]      = useState<Coupon | null>(null)
  const [esperando,  setEsperando]  = useState(true)
  const [generando,  setGenerando]  = useState(false)
  const [canjeando,  setCanjeando]  = useState(false)
  const [canjeado,   setCanjeado]   = useState(false)
  const [errorCanje, setErrorCanje] = useState('')

  const jugadorId = localStorage.getItem('jugadorId') ?? ''
  const salaId    = localStorage.getItem('salaId')    ?? 'sala-001'

  useEffect(() => {
    const procesarRanking = async (data: JugadorRanking[]) => {
      if (data.length === 0) return
      setRanking(data)
      setEsperando(false)
      const posicion = data.findIndex(j => j.jugadorId === jugadorId) + 1
      if (posicion >= 1 && posicion <= 3 && !cupon && !generando) {
        setGenerando(true)
        try {
          const res = await fetch(`${API_BASE}/coupons/generate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jugadorId, posicion }),
          })
          const cd = await res.json()
          if (cd.success) {
            setCupon(cd.data)
            enviarCuponPorCorreo(cd.data)
            socket.emit('cupon-generado', { salaId })
          }
        } catch (e) { console.error('Error generando cupón:', e) }
        finally { setGenerando(false) }
      }
    }
    socket.on('ranking-partida', procesarRanking)
    socket.on('partida-finalizada', ({ ranking }: { ranking: JugadorRanking[] }) => procesarRanking(ranking))
    return () => { socket.off('ranking-partida'); socket.off('partida-finalizada') }
  }, [socket, jugadorId, cupon, generando, salaId])

  const handleCanjear = async () => {
    if (!cupon || canjeado || canjeando) return
    setCanjeando(true)
    setErrorCanje('')
    try {
      const res = await fetch(`${API_BASE}/coupons/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: cupon.codigo, jugadorId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) {
        setErrorCanje('Error de conexión al canjear')
        return
      }
      if (data.success) {
        setCanjeado(true)
        setCupon(prev => prev ? { ...prev, canjeado: true } : prev)
        socket.emit('cupon-canjeado', { salaId, codigo: cupon.codigo })
      } else {
        setErrorCanje(data.error ?? 'No se pudo canjear el cupón')
      }
    } catch {
      setErrorCanje('Error de conexión al canjear')
    } finally {
      setCanjeando(false)
    }
  }

  const medallas = ['🥇', '🥈', '🥉']
  const posicion  = ranking.findIndex(j => j.jugadorId === jugadorId) + 1
  const misPuntos = ranking.find(j => j.jugadorId === jugadorId)?.puntos ?? 0
  const lugares   = ['', 'PRIMER LUGAR', 'SEGUNDO LUGAR', 'TERCER LUGAR']
  const enTop3    = posicion >= 1 && posicion <= 3

  if (esperando) {
    return (
      <div className="snap-screen">
        <div className="snap-pattern snap-pattern--teal" aria-hidden />
        <SnapHeader compact />
        <main className="snap-content" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1.5rem', paddingTop:'3rem' }}>
          <div style={{ fontSize:'3rem' }}>⏳</div>
          <h2 className="snap-title" style={{ textAlign:'center' }}>¡Terminaste!</h2>
          <p style={{ color:'rgba(255,255,255,0.6)', textAlign:'center', fontSize:'1rem' }}>
            Esperando que los demás jugadores terminen…
          </p>
          <div style={{ display:'flex', gap:'8px', justifyContent:'center', marginTop:'0.5rem' }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ width:10, height:10, borderRadius:'50%', background:'#7c3aed',
                animation:`pulse 1.2s ease-in-out ${i*0.4}s infinite` }} />
            ))}
          </div>
          <style>{`@keyframes pulse { 0%,100%{opacity:.2;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }`}</style>
        </main>
      </div>
    )
  }

  return (
    <div className="snap-screen">
      <div className="snap-pattern snap-pattern--teal" aria-hidden />
      <SnapHeader compact />
      <main className="snap-content">

        {enTop3 ? (
          <>
            <div className="result-status result-status--win">
              <h2>¡Felicitaciones!</h2>
              <p className="result-place">{lugares[posicion] || 'TOP 3'}</p>
            </div>

            <div className="result-points">
              <p className="result-points__value">{misPuntos.toLocaleString()}</p>
              <p className="result-points__label">Puntos totales</p>
            </div>

            {cupon ? (
              <>
                <div className="result-prize-card">
                  <p className="result-prize-card__title">Tu premio</p>
                  <p className="result-prize-card__discount">{cupon.descuento}% OFF</p>
                  <p className="result-prize-card__meta">Nivel {cupon.nivel} — Muéstraselo al cajero</p>
                  <span className="result-code">{cupon.codigo}</span>
                </div>

                <div className="result-email-box">
                  Cupón enviado a <strong>{localStorage.getItem('correo') ?? 'tu correo'}</strong>
                </div>

                {}
                {!canjeado ? (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ marginTop:'0.75rem', background: canjeando ? 'rgba(124,58,237,0.5)' : '#7c3aed', opacity: canjeando ? 0.7 : 1 }}
                    onClick={handleCanjear}
                    disabled={canjeando}
                  >
                    {canjeando ? 'Canjeando…' : '🎟️ Canjear cupón aquí'}
                  </button>
                ) : (
                  <div style={{ marginTop:'0.75rem', background:'rgba(34,197,94,0.12)', border:'1px solid #22c55e',
                    borderRadius:12, padding:'12px 16px', textAlign:'center', color:'#22c55e', fontWeight:700, fontSize:'0.95rem' }}>
                    ✅ ¡Cupón canjeado exitosamente!
                  </div>
                )}

                {errorCanje && (
                  <div style={{ marginTop:'0.5rem', background:'rgba(229,49,112,0.12)', border:'1px solid #e53170',
                    borderRadius:10, padding:'10px 14px', color:'#e53170', fontSize:'0.88rem', textAlign:'center' }}>
                    {errorCanje}
                  </div>
                )}
              </>
            ) : (
              <div className="result-prize-card" style={{ opacity:0.6 }}>
                <p className="result-prize-card__title">Generando tu cupón…</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="result-status result-status--lose">
              <h2>¡Buen intento!</h2>
              <p>Esta vez no estás en el top 3</p>
            </div>
            <div className="result-points">
              <p className="result-points__value">{misPuntos.toLocaleString()}</p>
              <p className="result-points__label">Tus puntos</p>
            </div>
          </>
        )}

        {ranking.length > 0 && (
          <>
            <h2 className="snap-title snap-title--sm">Top 3 — Esta partida</h2>
            <div className="result-ranking">
              {ranking.slice(0, 3).map((j, i) => (
                <p key={j.jugadorId} style={{ fontWeight: j.jugadorId === jugadorId ? 800 : 500 }}>
                  {medallas[i]} {j.nombre} — {j.puntos.toLocaleString()} pts
                  {j.jugadorId === jugadorId ? ' 👈' : ''}
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
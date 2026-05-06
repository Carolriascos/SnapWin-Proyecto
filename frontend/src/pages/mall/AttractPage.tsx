import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

/** Pantalla de atracción del mall — muestra QR y premios */
export default function AttractPage() {
  const navigate = useNavigate()
  const [urlJugador, setUrlJugador] = useState('')

  useEffect(() => {
    const url = import.meta.env.VITE_FRONTEND_URL ?? `https://hefty-army-celibacy.ngrok-free.dev`
    setUrlJugador(url)

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    script.onload = () => {
      const container = document.getElementById('qr-container')
      if (container && (window as any).QRCode) {
        container.innerHTML = ''
        new (window as any).QRCode(container, {
          text: url,
          width: 200,
          height: 200,
        })
      }
    }
    document.body.appendChild(script)
  }, [])

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>SNAP WIN</h1>
      <p style={{ fontSize: '1.5rem' }}>Escanea el QR con tu celular para jugar</p>

      {/* QR real escaneable */}
      <div id="qr-container" style={{ margin: '20px auto', display: 'inline-block' }} />

      <p style={{ fontSize: '1rem', background: '#eee', padding: '8px 16px', display: 'inline-block', borderRadius: '8px' }}>
        {urlJugador}
      </p>

      <h2>Premios</h2>
      <p>🥇 1er lugar — 20% descuento</p>
      <p>🥈 2do lugar — 15% descuento</p>
      <p>🥉 3er lugar — 10% descuento</p>
      <br />
      <button onClick={() => navigate('/mall/waiting')}>Ver sala de espera</button>
    </div>
  )
}
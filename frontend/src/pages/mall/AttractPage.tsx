import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import MallHeader from '../../components/MallHeader'
import { getPlayerAppUrl } from '../../utils/playerAppUrl'


export default function AttractPage() {
  const navigate = useNavigate()
  const [urlJugador, setUrlJugador] = useState('')

  useEffect(() => {
    const url = getPlayerAppUrl()
    setUrlJugador(url)

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    script.onload = () => {
      const container = document.getElementById('qr-container')
      if (container && (window as any).QRCode) {
        container.innerHTML = ''
        new (window as any).QRCode(container, {
          text: url,
          width: 220,
          height: 220,
        })
      }
    }
    document.body.appendChild(script)
  }, [])

  const esLocalhost =
    urlJugador.includes('localhost') || urlJugador.includes('127.0.0.1')

  return (
    <div className="mall-screen mall-attract">
      <div className="mall-pattern" aria-hidden />
      <MallHeader />

      <div className="mall-attract__grid">
        <div>
          <h2 className="mall-attract__title">
            ¡ESCANÉAME Y
            <span>JUEGA GRATIS!</span>
          </h2>
          <div className="mall-attract__tags">
            <span className="mall-attract__tag mall-attract__tag--shake">SHAKE BATTLE</span>
            <span className="mall-attract__tag mall-attract__tag--dodge">DODGE GAME</span>
          </div>
          <p className="mall-attract__wifi-hint">
            Escanea y elige tu juego en el celular · misma Wi‑Fi
          </p>
        </div>

        <div className="mall-attract__qr-wrap">
          <div id="qr-container" className="mall-qr-frame" />
        </div>
      </div>

      {urlJugador && (
        <p className="mall-attract__meta">
          {urlJugador}
          {esLocalhost && (
            <>
              <br />
              <span className="mall-attract__warn">
                Pon en frontend/.env: VITE_FRONTEND_URL=http://TU_IP:5173 (la IP Network de Vite)
              </span>
            </>
          )}
        </p>
      )}

      <div className="mall-attract__prizes">
        <span>🥇 1er lugar — 20%</span>
        <span>🥈 2do lugar — 15%</span>
        <span>🥉 3er lugar — 10%</span>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button type="button" className="mall-btn-secondary" onClick={() => navigate('/mall/waiting')}>
          Ver sala de espera
        </button>
      </div>
    </div>
  )
}

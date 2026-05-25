import { useNavigate } from 'react-router-dom'
import SnapHeader from '../../components/SnapHeader'
import { getGameLabel } from '../../utils/gameMode'

/** Premios disponibles antes de jugar */
export default function PrizesPage() {
  const navigate = useNavigate()
  return (
    <div className="snap-screen">
      <div className="snap-pattern" aria-hidden />
      <SnapHeader compact />
      <main className="snap-content">
        <h1 className="snap-title">¿Qué puedes ganar?</h1>
        <p className="snap-subtitle">
          Según tu posición al final de {getGameLabel()}
        </p>
        <div className="prizes-list">
          <div className="prize-card prize-card--gold">
            <h2>1er lugar — Oro</h2>
            <p>Cupón de descuento en tiendas participantes</p>
            <span className="prize-card__discount">20%</span>
          </div>
          <div className="prize-card prize-card--silver">
            <h2>2do lugar — Plata</h2>
            <p>Cupón de descuento en tiendas participantes</p>
            <span className="prize-card__discount">15%</span>
          </div>
          <div className="prize-card prize-card--bronze">
            <h2>3er lugar — Bronce</h2>
            <p>Cupón de descuento en tiendas participantes</p>
            <span className="prize-card__discount">10%</span>
          </div>
        </div>
      </main>
      <div className="snap-footer-actions">
        <button type="button" className="btn-primary" onClick={() => navigate('/instructions')}>
          Ver instrucciones
        </button>
      </div>
    </div>
  )
}

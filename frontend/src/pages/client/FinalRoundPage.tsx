import { useNavigate } from 'react-router-dom'
import SnapHeader from '../../components/SnapHeader'
import { getGameLabel } from '../../utils/gameMode'


export default function FinalRoundPage() {
  const navigate = useNavigate()

  return (
    <div className="snap-screen">
      <div className="snap-pattern snap-pattern--teal" aria-hidden />
      <SnapHeader compact />
      <main className="snap-content result-next-drop">
        <div className="result-next-drop__ring">
          <p className="result-next-drop__title">PRÓXIMA RONDA</p>
          <p className="result-next-drop__hint">
            Gracias por jugar {getGameLabel()}
          </p>
          <p className="result-next-drop__sub">
            El siguiente drop empieza pronto en la pantalla del mall
          </p>
          <p className="result-next-drop__time">2h</p>
        </div>
      </main>
      <div className="snap-footer-actions">
        <button type="button" className="btn-primary" onClick={() => navigate('/')}>
          Volver al inicio
        </button>
      </div>
    </div>
  )
}

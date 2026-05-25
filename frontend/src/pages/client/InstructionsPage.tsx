import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SnapHeader from '../../components/SnapHeader'
import { getGameMode, getGameLabel, hasGameMode } from '../../utils/gameMode'

/** Instrucciones del juego antes de entrar a la sala */
export default function InstructionsPage() {
  const navigate = useNavigate()
  const esDodge = getGameMode() === 'dodge'

  useEffect(() => {
    if (!hasGameMode()) navigate('/')
  }, [navigate])

  const pasos = esDodge
    ? [
        'Inclina el celular o usa ◀ ▶ para cambiar de carril',
        'Esquiva los bloques naranjas que caen',
        'Tienes 3 vidas y 30 segundos',
        'Los 3 con más puntos ganan cupón',
      ]
    : [
        'Agita tu celular con fuerza cuando empiece el juego',
        'Cada movimiento suma puntos',
        'Tienes 30 segundos',
        'Los 3 jugadores con más puntos ganan un cupón',
      ]

  return (
    <div className="snap-screen">
      <div className="snap-pattern" aria-hidden />
      <SnapHeader compact />
      <main className="snap-content">
        <h1 className="snap-title">Cómo jugar</h1>
        <p className="instructions-game">{getGameLabel()}</p>
        <ol className="instructions-list">
          {pasos.map((texto) => (
            <li key={texto}>{texto}</li>
          ))}
        </ol>
      </main>
      <div className="snap-footer-actions">
        <button type="button" className="btn-primary" onClick={() => navigate('/waiting')}>
          Ir a sala de espera
        </button>
      </div>
    </div>
  )
}

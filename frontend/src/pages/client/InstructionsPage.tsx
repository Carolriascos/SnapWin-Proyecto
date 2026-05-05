import { useNavigate } from 'react-router-dom'

/** Instrucciones del juego antes de entrar a la sala */
export default function InstructionsPage() {
  const navigate = useNavigate()
  return (
    <div>
      <h1> Cómo jugar</h1>
      <h2>Shake Battle</h2>
      <ol>
        <li>Agita tu celular con fuerza cuando empiece el juego</li>
        <li>Cada movimiento suma puntos</li>
        <li>Tienes 30 segundos</li>
        <li>Los 3 jugadores con más puntos ganan un cupón</li>
      </ol>
      <button onClick={() => navigate('/waiting')}>Entendido — ir a sala de espera</button>
    </div>
  )
}

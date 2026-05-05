import { useNavigate } from 'react-router-dom'

/** Muestra los premios disponibles antes de jugar */
export default function PrizesPage() {
  const navigate = useNavigate()
  return (
    <div>
      <h1>🏆 Premios</h1>
      <div><h2>🥇 1er lugar — Oro</h2><p>20% de descuento</p></div>
      <div><h2>🥈 2do lugar — Plata</h2><p>15% de descuento</p></div>
      <div><h2>🥉 3er lugar — Bronce</h2><p>10% de descuento</p></div>
      <button onClick={() => navigate('/instructions')}>Ver instrucciones</button>
    </div>
  )
}

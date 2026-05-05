import { useNavigate } from 'react-router-dom'

/** Pantalla de atracción del mall — muestra QR y premios */
export default function AttractPage() {
  const navigate = useNavigate()
  return (
    <div>
      <h1> SNAP WIN</h1>
      <p style={{ fontSize: '1.5rem' }}>Escanea el QR con tu celular para jugar</p>
      <p style={{ fontSize: '1.2rem', background: '#eee', padding: '10px', display: 'inline-block' }}>
         http://localhost:5173
      </p>
      <h2>Premios</h2>
      <p>🥇 1er lugar — 20% descuento</p>
      <p>🥈 2do lugar — 15% descuento</p>
      <p>🥉 3er lugar — 10% descuento</p>
      <br/>
      <button onClick={() => navigate('/mall/waiting')}>Ver sala de espera</button>
    </div>
  )
}

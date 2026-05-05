import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000'

/** Validador de cupones — el cajero ingresa el código y lo canjea */
export default function ValidatePage() {
  const navigate  = useNavigate()
  const [codigo,    setCodigo]    = useState('')
  const [resultado, setResultado] = useState<string | null>(null)
  const [color,     setColor]     = useState('black')

  const validar = async () => {
    if (!codigo.trim()) { alert('Ingresa un código'); return }

    setResultado('Verificando...')
    const upper = codigo.trim().toUpperCase()

    const res  = await fetch(`${BACKEND}/coupons/validate/${upper}`)
    const data = await res.json()

    if (!data.success) { setResultado(' Error del servidor'); setColor('red'); return }

    const { valido, motivo, coupon } = data.data
    if (!valido) { setResultado(`NO VÁLIDO: ${motivo}`); setColor('red'); return }

    const redeem = await fetch(`${BACKEND}/coupons/redeem/${upper}`, { method: 'PATCH' })
    const rd     = await redeem.json()

    if (rd.success) {
      setResultado(` CANJEADO: ${coupon.descuento}% descuento — Nivel ${coupon.nivel}`)
      setColor('green')
      setCodigo('')
    } else {
      setResultado(` Error al canjear: ${rd.error}`)
      setColor('red')
    }
  }

  return (
    <div>
      <h1> Validar Cupón</h1>
      <button onClick={() => navigate('/admin/dashboard')}>← Volver</button>
      <br/><br/>
      <input
        placeholder="Código del cupón (ej: FP-ABCD-XY)"
        value={codigo}
        onChange={e => setCodigo(e.target.value)}
        style={{ fontSize: '1.2rem', padding: '8px', width: '300px' }}
      /><br/><br/>
      <button onClick={validar} style={{ fontSize: '1.1rem', padding: '10px 20px' }}>
        Verificar cupón
      </button>
      {resultado && (
        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>{resultado}</p>
      )}
    </div>
  )
}

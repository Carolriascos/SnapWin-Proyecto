import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? ''

interface InfoCupon {
  nivel: string
  descuento: number
  canjeado: boolean
  expires_at: string
}

/** Validador de cupones — el cajero ingresa el código y lo canjea */
export default function ValidatePage() {
  const navigate = useNavigate()
  const [codigo,     setCodigo]     = useState('')
  const [resultado,  setResultado]  = useState<string | null>(null)
  const [color,      setColor]      = useState('black')
  const [cargando,   setCargando]   = useState(false)
  const [infoCupon,  setInfoCupon]  = useState<InfoCupon | null>(null)

  const resetear = () => {
    setCodigo('')
    setResultado(null)
    setInfoCupon(null)
    setColor('black')
  }

  const validar = async () => {
    if (!codigo.trim()) { alert('Ingresa un código'); return }

    setCargando(true)
    setResultado('Verificando...')
    setInfoCupon(null)
    const upper = codigo.trim().toUpperCase()

    try {
      // 1. Validar
      const res  = await fetch(`${BACKEND}/coupons/validate/${upper}`)
      const data = await res.json()

      if (!data.success) {
        setResultado('❌ Error del servidor')
        setColor('red')
        return
      }

      const { valido, motivo, coupon } = data.data

      if (!valido) {
        setResultado(`❌ NO VÁLIDO: ${motivo}`)
        setColor('red')
        return
      }

      // 2. Canjear
      const redeem = await fetch(`${BACKEND}/coupons/redeem/${upper}`, { method: 'PATCH' })
      const rd     = await redeem.json()

      if (rd.success) {
        setResultado(`✅ CANJEADO EXITOSAMENTE`)
        setColor('green')
        setInfoCupon({
          nivel:     coupon.nivel,
          descuento: coupon.descuento,
          canjeado:  true,
          expires_at: coupon.expires_at
        })
        setCodigo('')
      } else {
        setResultado(`❌ Error al canjear: ${rd.error}`)
        setColor('red')
      }
    } catch (e) {
      setResultado('❌ Sin conexión al servidor')
      setColor('red')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto' }}>
      <button onClick={() => navigate('/admin/dashboard')}>← Volver</button>

      <h1>🎟️ Validar Cupón</h1>
      <p style={{ color: '#666' }}>Ingresa el código que muestra el cliente en su celular</p>

      <input
        placeholder="Ej: FP-ABCD-XY"
        value={codigo}
        onChange={e => setCodigo(e.target.value.toUpperCase())}
        onKeyDown={e => e.key === 'Enter' && validar()}
        style={{ fontSize: '1.4rem', padding: '10px', width: '100%', letterSpacing: '4px', textAlign: 'center' }}
        disabled={cargando}
      />

      <br /><br />

      <button
        onClick={validar}
        disabled={cargando || !codigo.trim()}
        style={{ fontSize: '1.1rem', padding: '12px 28px', width: '100%', cursor: 'pointer' }}
      >
        {cargando ? '⏳ Verificando...' : '🔍 Verificar y canjear'}
      </button>

      {/* Resultado */}
      {resultado && resultado !== 'Verificando...' && (
        <div style={{
          marginTop: '24px',
          padding: '20px',
          borderRadius: '12px',
          border: `2px solid ${color}`,
          background: color === 'green' ? '#f0fff4' : '#fff5f5'
        }}>
          <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color, margin: 0 }}>
            {resultado}
          </p>

          {/* Detalle del cupón si fue canjeado */}
          {infoCupon && (
            <div style={{ marginTop: '12px', color: '#333' }}>
              <p>🏅 Nivel: <strong>{infoCupon.nivel}</strong></p>
              <p>💰 Descuento: <strong>{infoCupon.descuento}%</strong></p>
              <p>📅 Vencía: {new Date(infoCupon.expires_at).toLocaleDateString()}</p>
            </div>
          )}

          <button
            onClick={resetear}
            style={{ marginTop: '12px', padding: '8px 20px', cursor: 'pointer' }}
          >
            Validar otro cupón
          </button>
        </div>
      )}
    </div>
  )
}
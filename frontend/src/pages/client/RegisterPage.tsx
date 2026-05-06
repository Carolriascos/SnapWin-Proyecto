import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RegisterPayload } from '../../types'

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:5173'

/** Formulario de registro del jugador */
export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<RegisterPayload>({
    nombre: '', edad: 0, genero: 'Hombre', correo: '', salaId: 'sala-001'
  })
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const registrar = async () => {
    if (!form.nombre || !form.edad || !form.correo) {
      setError('Todos los campos son obligatorios')
      return
    }
    try {
    console.log('Intentando conectar a:', BACKEND)
    const res = await fetch(`${BACKEND}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, edad: Number(form.edad) })
    })
    const data = await res.json()
    console.log('Respuesta:', data)
    if (data.success) {
      localStorage.setItem('jugadorId', data.data.jugadorId)
      localStorage.setItem('salaId', form.salaId)
      navigate('/prizes')
    } else {
      setError('Error: ' + data.error)
    }
    } catch (e: any) {
      setError('No se pudo conectar al servidor: ' + e.message)
      console.error(e)
    }
  }

  return (
    <div>
      <h1>Registro</h1>
      <input name="nombre"  placeholder="Nombre"  onChange={handleChange} /><br/><br/>
      <input name="edad"    placeholder="Edad" type="number" onChange={handleChange} /><br/><br/>
      <select name="genero" onChange={handleChange}>
        <option value="Hombre">Hombre</option>
        <option value="Mujer">Mujer</option>
        <option value="Otro">Otro</option>
      </select><br/><br/>
      <input name="correo"  placeholder="Correo" type="email" onChange={handleChange} /><br/><br/>
      <button onClick={registrar}>Unirme al juego</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}

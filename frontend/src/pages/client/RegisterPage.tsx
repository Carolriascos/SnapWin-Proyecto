import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RegisterPayload } from '../../types'
import SnapHeader from '../../components/SnapHeader'
import { API_BASE } from '../../config/api'
import { getGameLabel, hasGameMode } from '../../utils/gameMode'

/** Formulario de registro del jugador */
export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<RegisterPayload>({
    nombre: '', edad: 0, genero: 'Hombre', correo: '', salaId: 'sala-001'
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hasGameMode()) navigate('/')
  }, [navigate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const registrar = async () => {
    if (!form.nombre || !form.edad || !form.correo) {
      setError('Todos los campos son obligatorios')
      return
    }
    try {
    const url = `${API_BASE}/auth/register`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, edad: Number(form.edad) })
    })

    const text = await res.text()
    let data: { success?: boolean; error?: string; data?: { jugadorId: string } } = {}
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        setError('El servidor respondió con un formato inválido. ¿Está corriendo el backend?')
        return
      }
    }

    if (!res.ok) {
      setError(data.error ?? `Error del servidor (${res.status})`)
      return
    }

    if (data.success) {
      localStorage.setItem('jugadorId', data.data!.jugadorId)
      localStorage.setItem('salaId', form.salaId)
      localStorage.setItem('nombre', form.nombre)
      localStorage.setItem('correo', form.correo)
      navigate('/prizes')
    } else {
      setError('Error: ' + (data.error ?? 'registro fallido'))
    }
    } catch (e: any) {
      setError('No se pudo conectar al servidor: ' + e.message)
      console.error(e)
    }
  }

  return (
    <div className="snap-screen">
      <div className="snap-pattern" aria-hidden />
      <SnapHeader compact />
      <main className="snap-content">
        <h1 className="snap-title">¡Regístrate!</h1>
        <p className="snap-subtitle">
          Juego elegido: <strong>{getGameLabel()}</strong>
          <br />
          &quot;Gana y recibe tu cupón por correo&quot;
        </p>
        <div className="register-form">
          <div className="register-field">
            <label htmlFor="nombre">Nombre</label>
            <input id="nombre" name="nombre" placeholder="Nombre" onChange={handleChange} />
          </div>
          <div className="register-field">
            <label htmlFor="edad">Edad</label>
            <input id="edad" name="edad" placeholder="Edad" type="number" onChange={handleChange} />
          </div>
          <div className="register-field">
            <label htmlFor="genero">Género</label>
            <select id="genero" name="genero" onChange={handleChange}>
              <option value="Hombre">Hombre</option>
              <option value="Mujer">Mujer</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div className="register-field">
            <label htmlFor="correo">Correo</label>
            <input id="correo" name="correo" placeholder="Correo" type="email" onChange={handleChange} />
          </div>
          {error && <p className="snap-error">{error}</p>}
        </div>
      </main>
      <div className="snap-footer-actions">
        <button type="button" className="btn-primary" onClick={registrar}>
          Continuar
        </button>
      </div>
    </div>
  )
}

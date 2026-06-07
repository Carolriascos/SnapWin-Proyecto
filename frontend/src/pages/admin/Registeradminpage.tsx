import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/pages/admin/register.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "";

export default function RegisterAdminPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: "", usuario: "", correo: "", password: "",
  });
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const registrar = async () => {
    const { nombre, usuario, correo, password } = form;
    if (!nombre || !usuario || !correo || !password) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setCargando(true);
    try {
      const res = await fetch(`${BACKEND}/api/admin/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, usuario, correo, password }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError("Error: " + data.error);
      }
    } catch (e: any) {
      setError("No se pudo conectar al servidor: " + e.message);
    } finally {
      setCargando(false);
    }
  };

  if (success) {
    return (
      <div className="register-page register-page--success">
        <div className="register-bg" aria-hidden="true" />
        <div className="register-success">
          <h1 className="register-success__title">¡Registro exitoso!</h1>
          <p>La cuenta de <strong>{form.nombre}</strong> ha sido creada.</p>
          <button className="register-btn-primary" onClick={() => navigate("/admin")}>
            Ir al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      
      <div className="register-bg" aria-hidden="true" />

      
      <div className="register-location">
        <svg className="register-location__icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
        </svg>
        Chipichape Cali
      </div>

      
      <header className="register-logo">
        <div className="register-logo__wordmark">
          <span className="register-logo__snap">snap</span>
          <span className="register-logo__n"> n</span>
          <svg className="register-logo__bolt" viewBox="0 0 18 22" fill="none">
            <path d="M11 2L3 13h7l-1.5 9L17 11h-7L11 2z" fill="#ff8c1a"/>
          </svg>
          <span className="register-logo__win">win</span>
        </div>
        <p className="register-logo__tagline">
          <span>live </span>
          <span className="register-logo__exp">experience</span>
        </p>
      </header>

      
      <div className="register-layout">
        
        <main className="register-form-col">
          <h1 className="register-form__title">Registro</h1>

          <div className="register-field">
            <label className="register-field__label">Nombre completo</label>
            <input
              className="register-field__input"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
            />
          </div>

          <div className="register-field">
            <label className="register-field__label">Usuario</label>
            <input
              className="register-field__input"
              name="usuario"
              type="text"
              value={form.usuario}
              onChange={handleChange}
            />
          </div>

          <div className="register-field">
            <label className="register-field__label">Correo</label>
            <input
              className="register-field__input"
              name="correo"
              type="email"
              value={form.correo}
              onChange={handleChange}
            />
          </div>

          <div className="register-field">
            <label className="register-field__label">Contraseña</label>
            <input
              className="register-field__input"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          {error && <p className="register-error">{error}</p>}

          <button
            className="register-btn-primary"
            onClick={registrar}
            disabled={cargando}
          >
            {cargando ? "Registrando..." : "Crear Cuenta"}
          </button>

          <p className="register-footer">
            ¿Ya tienes cuenta?{" "}
            <button
              className="register-link"
              onClick={() => navigate("/admin")}
            >
              Iniciar sesión
            </button>
          </p>
        </main>

        
        <aside className="register-orb-col" aria-hidden="true">
          <div className="register-orb">
            <p className="register-orb__text">
              "Comienza a gestionar la experiencia de juego"
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
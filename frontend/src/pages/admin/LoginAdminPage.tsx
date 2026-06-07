import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/pages/admin/login.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "";

export default function LoginAdminPage() {
  const navigate = useNavigate();
  const [usuario,  setUsuario]  = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [cargando, setCargando] = useState(false);

  const login = async () => {
    if (!usuario || !password) {
      setError("Completa todos los campos");
      return;
    }
    setCargando(true);
    try {
      const res  = await fetch(`${BACKEND}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("adminLoggedIn", "true");
        localStorage.setItem("adminNombre", data.data.nombre);
        navigate("/admin/dashboard");
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError("No se pudo conectar al servidor");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">
      
      <div className="login-bg" aria-hidden="true" />

      
      <div className="login-location">
        <svg className="login-location__icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
        </svg>
        Chipichape Cali
      </div>

      
      <header className="login-logo">
        <div className="login-logo__wordmark">
          <span className="login-logo__snap">snap</span>
          <span className="login-logo__n"> n</span>
          <svg className="login-logo__bolt" viewBox="0 0 18 22" fill="none">
            <path d="M11 2L3 13h7l-1.5 9L17 11h-7L11 2z" fill="#ff8c1a"/>
          </svg>
          <span className="login-logo__win">win</span>
        </div>
        <p className="login-logo__tagline">
          <span>live </span>
          <span className="login-logo__exp">experience</span>
        </p>
      </header>

      
      <main className="login-card">
        <h1 className="login-card__title">¡Bienvenido de nuevo!</h1>
        <p className="login-card__subtitle">Inicie sesión para continuar.</p>

        <div className="login-field">
          <label className="login-field__label">Usuario</label>
          <input
            className="login-field__input"
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
          />
        </div>

        <div className="login-field">
          <label className="login-field__label">Contraseña</label>
          <input
            className="login-field__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
          />
        </div>

        {error && <p className="login-error">{error}</p>}

        <button
          className="login-btn-primary"
          onClick={login}
          disabled={cargando}
        >
          {cargando ? "Entrando..." : "Iniciar sesión"}
        </button>

        <p className="login-footer">
          ¿No tienes cuenta?{" "}
          <button
            className="login-link"
            onClick={() => navigate("/admin/register")}
          >
            Crear cuenta
          </button>
        </p>
      </main>
    </div>
  );
}
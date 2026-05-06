import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
    <div>
      <h1>Panel de administrador</h1>
      <input placeholder="Usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
      <br /><br />
      <input placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} type="password"
        onKeyDown={(e) => e.key === 'Enter' && login()} />
      <br /><br />
      <button onClick={login} disabled={cargando}>
        {cargando ? "Entrando..." : "Entrar"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <br /><br />
      <button onClick={() => navigate("/admin/register")}>Crear cuenta de administrador</button>
    </div>
  );
}
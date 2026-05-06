import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginAdminPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = () => {
    if (usuario === "admin" && password === "snapwin123") {
      localStorage.setItem("adminLoggedIn", "true");
      navigate("/admin/dashboard");
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div>
      <h1>Panel de administrador</h1>
      <input placeholder="Usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
      <br />
      <br />
      <input placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
      <br />
      <br />
      <button onClick={login}>Entrar</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <br />
      <br />
      <button onClick={() => navigate("/admin/register")}>Crear cuenta de administrador</button>
    </div>
  );
}

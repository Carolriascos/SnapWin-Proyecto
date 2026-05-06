import { useState } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "";

export default function RegisterAdminPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: "", usuario: "", correo: "", password: "",
  });
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);
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
      <div>
        <h1>¡Registro exitoso!</h1>
        <p>La cuenta de <strong>{form.nombre}</strong> ha sido creada.</p>
        <button onClick={() => navigate("/admin")}>Ir al login</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Registro de administrador</h1>
      <input name="nombre"   placeholder="Nombre completo"            value={form.nombre}   onChange={handleChange} /><br /><br />
      <input name="usuario"  placeholder="Usuario"                    value={form.usuario}  onChange={handleChange} /><br /><br />
      <input name="correo"   placeholder="Correo electrónico" type="email"    value={form.correo}   onChange={handleChange} /><br /><br />
      <input name="password" placeholder="Contraseña (mínimo 8 caracteres)" type="password" value={form.password}  onChange={handleChange} /><br /><br />
      <button onClick={registrar} disabled={cargando}>
        {cargando ? "Registrando..." : "Registrarse"}
      </button><br /><br />
      <button onClick={() => navigate("/admin")}>Volver al login</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RegisterAdminPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: "",
    usuario: "",
    correo: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const registrar = () => {
    const { nombre, usuario, correo, password } = form;

    if (!nombre || !usuario || !correo || !password) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    // Aquí conectarías con tu backend cuando tengas el endpoint de admin
    setSuccess(true);
  };

  if (success) {
    return (
      <div>
        <h1>¡Registro exitoso!</h1>
        <p>
          La cuenta de <strong>{form.nombre}</strong> ha sido creada.
        </p>
        <button onClick={() => navigate("/admin")}>Ir al login</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Registro de administrador</h1>

      <input name="nombre" placeholder="Nombre completo" value={form.nombre} onChange={handleChange} />
      <br />
      <br />

      <input name="usuario" placeholder="Usuario" value={form.usuario} onChange={handleChange} />
      <br />
      <br />

      <input name="correo" placeholder="Correo electrónico" type="email" value={form.correo} onChange={handleChange} />
      <br />
      <br />

      <input
        name="password"
        placeholder="Contraseña (mínimo 8 caracteres)"
        type="password"
        value={form.password}
        onChange={handleChange}
      />
      <br />
      <br />

      <button onClick={registrar}>Registrarse</button>
      <br />
      <br />
      <button onClick={() => navigate("/admin")}>Volver al login</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

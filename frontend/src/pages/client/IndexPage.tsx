import { useNavigate } from "react-router-dom";

/** Pantalla de bienvenida — muestra el QR para unirse */
export default function IndexPage() {
  const navigate = useNavigate();
  return (
    <div>
      <h1> Snap Win</h1>
      <p>Escanea el QR o presiona el botón para unirte al juego</p>
      <button onClick={() => navigate("/register")}>Registrarse</button>
    </div>
  );
}

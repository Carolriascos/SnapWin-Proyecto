import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/** Dashboard del admin — iniciar ronda y navegar a validar cupones */
export default function DashboardPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("adminLoggedIn")) navigate("/admin");
  }, [navigate]);

  return (
    <div>
      <h1>Dashboard Admin</h1>
      <h2>Control del juego</h2>
      <button onClick={() => alert("Ronda iniciada — los jugadores pueden escanear el QR")}>Iniciar nueva ronda</button>
      <br />
      <br />
      <button onClick={() => navigate("/admin/validate")}>Validar cupones</button>
      <br />
      <br />
      <button
        onClick={() => {
          localStorage.removeItem("adminLoggedIn");
          navigate("/admin");
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}

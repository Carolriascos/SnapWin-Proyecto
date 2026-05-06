import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../hooks/useSocket";

/** Dashboard del admin — iniciar ronda y navegar a validar cupones */
export default function DashboardPage() {
  const navigate = useNavigate();

  const socket = useSocket();
  const [rondaActiva, setRondaActiva] = useState(false);
  const salaId = "sala-001";

  useEffect(() => {
    if (!localStorage.getItem("adminLoggedIn")) navigate("/admin");
  }, [navigate]);


  const iniciarRonda = () => {
    socket.emit("admin-start-round", { salaId });
    setRondaActiva(true);
  };


  return (
    <div style={{ padding: "20px" }}>
      <h1>Dashboard Admin</h1>
      <h2>Control del juego</h2>

      <button
        onClick={iniciarRonda}
        disabled={rondaActiva}
        style={{ fontSize: "1.2rem", padding: "12px 24px" }}
      >
        {rondaActiva ? "⏳ Ronda en curso..." : "▶ Iniciar nueva ronda"}
      </button>

      {rondaActiva && (
        <p style={{ color: "green" }}>
          ✅ Señal enviada — los jugadores verán la cuenta regresiva
        </p>
      )}

      <br /><br />
      <button onClick={() => navigate("/admin/validate")}>Validar cupones</button>
      <br /><br />
      <button onClick={() => {
        localStorage.removeItem("adminLoggedIn");
        navigate("/admin");
      }}>
        Cerrar sesión
      </button>
    </div>
  );
}

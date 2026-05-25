import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../hooks/useSocket";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "";
const SALA_ID = "sala-001";

interface Jugador {
  id: string;
  nombre: string;
  puntos: number;
  juego?: string;
}

interface Stats {
  totalJugadores: number;
  totalRondas: number;
  topJugadores: { nombre: string; puntos: number; juego: string }[];
}

export default function DashboardPage() {
  const navigate     = useNavigate();
  const socket       = useSocket();
  const [rondaActiva, setRondaActiva] = useState(false);
  const [jugadoresVivos, setJugadoresVivos] = useState<Jugador[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const adminNombre = localStorage.getItem("adminNombre") ?? "Admin";

  useEffect(() => {
    if (!localStorage.getItem("adminLoggedIn")) navigate("/admin");
  }, [navigate]);

  // Cargar estadísticas generales
  useEffect(() => {
    const cargar = async () => {
      try {
        const res  = await fetch(`${BACKEND}/scores/ranking/${SALA_ID}`);
        const data = await res.json();
        if (data.success) {
          setStats({
            totalJugadores: data.data.length,
            totalRondas: 1,
            topJugadores: data.data.slice(0, 5).map((j: any) => ({
              nombre: j.jugadores?.nombre ?? "Jugador",
              puntos: j.puntos,
              juego:  j.juego ?? "shake"
            }))
          });
        }
      } catch (e) {
        console.error("Error cargando stats:", e);
      }
    };
    cargar();
  }, []);

  //  jugadores conectados en tiempo real
  useEffect(() => {
    const emitJoin = () => {
      socket.emit("join-sala", { salaId: SALA_ID, jugador: { id: "admin-panel", nombre: "Admin" } });
    };
    if (socket.connected) emitJoin();
    else socket.on("connect", emitJoin);

    socket.on("players-update", (jugadores: any[]) => {
      setJugadoresVivos(
        jugadores
          .filter(j => j.id !== "admin-panel" && j.id !== "mall-screen")
          .map(j => ({ id: j.id, nombre: j.nombre || "Jugador", puntos: 0 }))
      );
    });

    socket.on("score-update", ({ jugadorId, fuerza }: { jugadorId: string; fuerza: number }) => {
      setJugadoresVivos(prev =>
        prev.map(j => j.id === jugadorId ? { ...j, puntos: j.puntos + Math.round(fuerza) } : j)
      );
    });

    socket.on("player-finished", () => setRondaActiva(false));

    return () => {
      socket.off("connect", emitJoin);
      socket.off("players-update");
      socket.off("score-update");
      socket.off("player-finished");
    };
  }, [socket]);

  const iniciarRonda = () => {
    socket.emit("admin-start-round", { salaId: SALA_ID });
    setRondaActiva(true);
  };

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Dashboard Admin</h1>
      <p>Bienvenido, <strong>{adminNombre}</strong></p>

      {/* Control de ronda */}
      <div style={{ background: "#ffffff", padding: "16px", borderRadius: "12px", marginBottom: "24px" }}>
        <h2>Control del juego</h2>
        <button
          onClick={iniciarRonda}
          disabled={rondaActiva}
          style={{ fontSize: "1.1rem", padding: "10px 24px", marginRight: "12px" }}
        >
          {rondaActiva ? " Ronda en curso..." : " Iniciar nueva ronda"}
        </button>
        <button onClick={() => navigate("/admin/validate")} style={{ padding: "10px 24px" }}>
           Validar cupones
        </button>
      </div>

      {/* Jugadores conectados  */}
      <div style={{ background: "#ffffff", padding: "16px", borderRadius: "12px", marginBottom: "24px" }}>
        <h2>Jugadores conectados ahora ({jugadoresVivos.length})</h2>
        {jugadoresVivos.length === 0
          ? <p style={{ color: "#909090" }}>Ningún jugador conectado</p>
          : jugadoresVivos.map(j => (
            <div key={j.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #ddd" }}>
              <span> {j.nombre}</span>
              <span><strong>{j.puntos} pts</strong></span>
            </div>
          ))
        }
      </div>

      {/* Estadísticas generales */}
      {stats && (
        <div style={{ background: "#ffffff", padding: "16px", borderRadius: "12px", marginBottom: "24px" }}>
          <h2>Top jugadores de la sesión</h2>
          {stats.topJugadores.length === 0
            ? <p style={{ color: "#888" }}>Sin partidas aún</p>
            : stats.topJugadores.map((j, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #ddd" }}>
                <span>{i === 0 ? "" : i === 1 ? "" : i === 2 ? "" : `${i+1}.`} {j.nombre}</span>
                <span><strong>{j.puntos} pts</strong> — {j.juego}</span>
              </div>
            ))
          }
        </div>
      )}

      <button
        onClick={() => { localStorage.removeItem("adminLoggedIn"); navigate("/admin"); }}
        style={{ color: "red", marginTop: "16px" }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
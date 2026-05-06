import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../hooks/useSocket";
import { ScoreEntry } from "../../types";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? '';
const SALA_ID = "sala-001";

/** Podio final visible en la pantalla grande del mall */
export default function ResultsMallPage() {
  const navigate = useNavigate();
  const socket   = useSocket();
  const [top3, setTop3]           = useState<ScoreEntry[]>([]);
  const [terminados, setTerminados] = useState<number>(0);
  const [animando, setAnimando]   = useState(false);

  // Carga inicial del ranking
  const cargarRanking = async () => {
    const res  = await fetch(`${BACKEND}/scores/ranking/${SALA_ID}`);
    const data = await res.json();
    if (data.success) setTop3(data.data);
  };

  useEffect(() => {
    cargarRanking();

    // Cada vez que un jugador termina, refrescar el ranking
    socket.on("player-finished", () => {
      setTerminados(prev => prev + 1);
      setAnimando(true);
      setTimeout(() => setAnimando(false), 600);
      cargarRanking();
    });

    return () => {
      socket.off("player-finished");
    };
  }, [socket]);

  const medallas  = ["🥇", "🥈", "🥉"];
  const tamaños   = ["2.5rem", "2rem", "1.75rem"];
  const colores   = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <div style={{ textAlign: "center", padding: "32px", minHeight: "100vh", background: "#0f0f1a", color: "white" }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "8px" }}>🏆 Resultados Finales</h1>

      {terminados > 0 && (
        <p style={{ color: "#aaa", marginBottom: "32px" }}>
          {terminados} jugador{terminados !== 1 ? "es" : ""} terminó la partida
        </p>
      )}

      {top3.length === 0 ? (
        <p style={{ color: "#666", fontSize: "1.5rem", marginTop: "60px" }}>
          ⏳ Esperando resultados...
        </p>
      ) : (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxWidth: "600px",
          margin: "0 auto",
          transition: animando ? "all 0.3s ease" : undefined
        }}>
          {top3.map((j, i) => (
            <div
              key={j.jugador_id}
              style={{
                background: `${colores[i]}22`,
                border: `2px solid ${colores[i]}`,
                borderRadius: "16px",
                padding: "20px 32px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: tamaños[i],
              }}
            >
              <span>{medallas[i]} {j.jugadores?.nombre ?? "Jugador"}</span>
              <span style={{ fontWeight: "bold", color: colores[i] }}>
                {j.puntos} pts
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "48px" }}>
        <button
          onClick={() => navigate("/mall")}
          style={{
            fontSize: "1.2rem",
            padding: "14px 32px",
            borderRadius: "12px",
            background: "#7c3aed",
            color: "white",
            border: "none",
            cursor: "pointer"
          }}
        >
          🔄 Nueva ronda
        </button>
      </div>
    </div>
  );
}
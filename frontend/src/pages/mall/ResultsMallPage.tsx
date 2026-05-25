import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../hooks/useSocket";
import { ScoreEntry } from "../../types";
import MallHeader from "../../components/MallHeader";
import { API_BASE } from "../../config/api";
const SALA_ID = "sala-001";

/** Podio final visible en la pantalla grande del mall */
export default function ResultsMallPage() {
  const navigate = useNavigate();
  const socket = useSocket();
  const [top3, setTop3] = useState<ScoreEntry[]>([]);
  const [terminados, setTerminados] = useState<number>(0);
  const [animando, setAnimando] = useState(false);

  // Carga inicial del ranking
  const cargarRanking = async () => {
    const res = await fetch(`${API_BASE}/scores/ranking/${SALA_ID}`);
    const data = await res.json();
    if (data.success) setTop3(data.data);
  };

  useEffect(() => {
    cargarRanking();

    // Cada vez que un jugador termina, refrescar el ranking
    socket.on("player-finished", () => {
      setTerminados((prev) => prev + 1);
      setAnimando(true);
      setTimeout(() => setAnimando(false), 600);
      cargarRanking();
    });

    return () => {
      socket.off("player-finished");
    };
  }, [socket]);

  const medallas = ["🥇", "🥈", "🥉"];
  const podiumOrder = [1, 0, 2];

  const renderPodium = () => (
    <div className="mall-podium">
      {podiumOrder.map((idx) => {
        const j = top3[idx];
        if (!j) return null;
        return (
          <div
            key={j.jugador_id}
            className={`mall-podium__place mall-podium__place--${idx + 1}`}
            style={{ opacity: animando ? 0.85 : 1 }}
          >
            <span className="mall-podium__medal">{medallas[idx]}</span>
            <span className="mall-podium__name">{j.jugadores?.nombre ?? "Jugador"}</span>
            <span className="mall-podium__pts">{j.puntos} pts</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="mall-screen mall-results">
      <div className="mall-pattern" aria-hidden />
      <MallHeader />

      <h1 className="mall-results__title">WINNERS!</h1>

      {terminados > 0 && (
        <p className="mall-results__sub">
          {terminados} jugador{terminados !== 1 ? "es" : ""} terminó la partida
        </p>
      )}

      {top3.length === 0 ? (
        <p className="mall-results__empty">Esperando resultados...</p>
      ) : (
        <div className="mall-results__columns">
          <section className="mall-results__section">
            <h2>SHAKE BATTLE</h2>
            {renderPodium()}
          </section>
          <section className="mall-results__section">
            <h2>DODGE GAME</h2>
            {renderPodium()}
          </section>
        </div>
      )}

      <button type="button" className="mall-btn-primary" onClick={() => navigate("/mall")}>
        Nueva ronda
      </button>
    </div>
  );
}

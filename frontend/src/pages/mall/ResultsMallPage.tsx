import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScoreEntry } from "../../types";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000";

/** Podio final visible en la pantalla grande del mall */
export default function ResultsMallPage() {
  const navigate = useNavigate();
  const [top3, setTop3] = useState<ScoreEntry[]>([]);

  useEffect(() => {
    fetch(`${BACKEND}/scores/ranking/sala-001`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setTop3(d.data);
      });
  }, []);

  const medallas = ["🥇 1er lugar", "🥈 2do lugar", "🥉 3er lugar"];

  return (
    <div>
      <h1> Resultados finales</h1>
      {top3.length === 0 ? (
        <p>Sin resultados aún</p>
      ) : (
        top3.map((j, i) => (
          <div key={j.jugador_id} style={{ fontSize: "2rem", margin: "16px" }}>
            {medallas[i]}: {j.jugadores?.nombre ?? "Jugador"} — {j.puntos} pts
          </div>
        ))
      )}
      <br />
      <button onClick={() => navigate("/mall")}>Nueva ronda</button>
    </div>
  );
}

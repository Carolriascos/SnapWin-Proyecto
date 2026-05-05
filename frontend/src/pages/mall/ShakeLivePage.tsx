import { useEffect, useState } from "react";
import { useSocket } from "../../hooks/useSocket";

interface JugadorScore {
  nombre: string;
  color: string;
  puntos: number;
}

/** Tablero en vivo durante el Shake Battle — se actualiza por Socket.io */
export default function ShakeLivePage() {
  const socket = useSocket();
  const [scores, setScores] = useState<Record<string, JugadorScore>>({});

  useEffect(() => {
    socket.on("players-update", (jugadores: any[]) => {
      setScores((prev) => {
        const next = { ...prev };
        jugadores.forEach((j) => {
          if (!next[j.id]) next[j.id] = { nombre: j.nombre || "Jugador", color: j.color || "#888", puntos: 0 };
        });
        return next;
      });
    });

    socket.on("score-update", ({ jugadorId, fuerza }: { jugadorId: string; fuerza: number }) => {
      setScores((prev) => {
        if (!prev[jugadorId]) return prev;
        return { ...prev, [jugadorId]: { ...prev[jugadorId], puntos: prev[jugadorId].puntos + Math.round(fuerza) } };
      });
    });

    return () => {
      socket.off("players-update");
      socket.off("score-update");
    };
  }, [socket]);

  const ordenados = Object.entries(scores).sort(([, a], [, b]) => b.puntos - a.puntos);

  return (
    <div>
      <h1> SHAKE BATTLE en vivo</h1>
      {ordenados.map(([id, j], i) => (
        <div
          key={id}
          style={{ background: j.color, padding: "16px", margin: "8px", borderRadius: "8px", fontSize: "1.5rem" }}
        >
          {i + 1}. {j.nombre} — {j.puntos} pts
        </div>
      ))}
    </div>
  );
}

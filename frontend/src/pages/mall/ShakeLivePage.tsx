import { useEffect, useState } from "react";
import { useSocket } from "../../hooks/useSocket";
import { useNavigate } from 'react-router-dom'

interface JugadorScore {
  nombre: string;
  color: string;
  puntos: number;
}

export default function ShakeLivePage() {
  const socket   = useSocket();
  const navigate = useNavigate();
  const [scores, setScores] = useState<Record<string, JugadorScore>>({});

  useEffect(() => {
    const emitJoin = () => {
      socket.emit('join-sala', { 
        salaId: 'sala-001', 
        jugador: { id: 'mall-screen', nombre: 'Mall' } 
      })
    }

    if (socket.connected) {
      emitJoin()
    } else {
      socket.on('connect', emitJoin)
    }

    socket.on("players-update", (jugadores: any[]) => {
      setScores((prev) => {
        const next = { ...prev };
        jugadores.forEach((j) => {
          if (j.id === 'mall-screen') return
          if (!next[j.id]) next[j.id] = { 
            nombre: j.nombre || "Jugador", 
            color: j.color || "#888", 
            puntos: 0 
          };
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

    socket.on("player-finished", () => {
      setTimeout(() => navigate("/mall/results"), 3000);
    });

    return () => {
      socket.off('connect', emitJoin)
      socket.off("players-update");
      socket.off("score-update");
      socket.off("player-finished");
    };
  }, [socket, navigate]);

  const ordenados = Object.entries(scores)
    .filter(([id]) => id !== 'mall-screen')
    .sort(([, a], [, b]) => b.puntos - a.puntos);

  return (
    <div>
      <h1>🔥 SHAKE BATTLE en vivo</h1>
      {ordenados.length === 0
        ? <p>Esperando puntajes...</p>
        : ordenados.map(([id, j], i) => (
          <div
            key={id}
            style={{ background: j.color, padding: "16px", margin: "8px", borderRadius: "8px", fontSize: "1.5rem", color: 'white', fontWeight: 'bold' }}
          >
            {i + 1}. {j.nombre} — {j.puntos} pts
          </div>
        ))
      }
    </div>
  );
}
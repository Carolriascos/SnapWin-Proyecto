import { useEffect, useState } from "react";
import { useSocket } from "../../hooks/useSocket";
import { useNavigate } from 'react-router-dom'
import MallHeader from '../../components/MallHeader'

interface JugadorScore {
  nombre: string;
  color: string;
  puntos: number;
}

const BOARD_DOTS = 72
const DOT_COLORS = ["#db2777", "#ea580c", "#16a34a", "#7c3aed"]

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

  const left = ordenados.slice(1, 3)
  const right = [ordenados[0], ordenados[3]].filter(Boolean) as [string, JugadorScore][]
  const ranks = ['2do lugar', '3er lugar', '1er lugar', '4to lugar']

  const renderCard = ([id, j]: [string, JugadorScore], rankLabel: string) => (
    <div key={id} className="mall-leader-card" style={{ borderColor: j.color }}>
      <p className="mall-leader-card__name">{j.nombre}</p>
      <p className="mall-leader-card__pts">{j.puntos.toLocaleString()} pts</p>
      <p className="mall-leader-card__rank">{rankLabel}</p>
    </div>
  )

  return (
    <div className="mall-screen mall-shake">
      <div className="mall-pattern" aria-hidden />
      <MallHeader />

      <div className="mall-shake__top">
        <p className="mall-live-badge">¡JUEGO EN VIVO!</p>
        <span className="mall-mode-tag">SHAKE BATTLE</span>
      </div>

      <div className="mall-shake__layout">
        <aside>
          <p className="mall-shake__timer">
            00:30
            <small>TIEMPO RESTANTE</small>
          </p>
          {left.map(([id, j], i) => renderCard([id, j], ranks[i + 1] ?? ''))}
        </aside>

        <div>
          {ordenados.length === 0 ? (
            <p className="mall-shake__empty">Esperando puntajes...</p>
          ) : (
            <div className="mall-board" aria-hidden>
              {Array.from({ length: BOARD_DOTS }, (_, i) => (
                <span
                  key={i}
                  className="mall-board__dot"
                  style={{ background: DOT_COLORS[i % DOT_COLORS.length] }}
                />
              ))}
            </div>
          )}
          <div className="mall-shake__hint-box">
             agita tu celular más fuerte!
          </div>
        </div>

        <aside>
          {right.map(([id, j], i) =>
            renderCard([id, j], i === 0 ? ranks[2] : ranks[3])
          )}
        </aside>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useSocket } from "../../hooks/useSocket";
import { useNavigate } from 'react-router-dom'
import MallHeader from '../../components/MallHeader'

interface JugadorScore {
  nombre: string;
  color: string;
  puntos: number;
}

export default function ShakeLivePage() {
  const socket   = useSocket();
  const navigate = useNavigate();
  const [scores, setScores] = useState<Record<string, JugadorScore>>({});
  const [countdown, setCountdown] = useState<number | null>(null);
  const totalPuntosRef = useRef<Record<string, number>>({});

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
      totalPuntosRef.current[jugadorId] = (totalPuntosRef.current[jugadorId] ?? 0) + Math.round(fuerza);
      setScores((prev) => {
        if (!prev[jugadorId]) return prev;
        return { 
          ...prev, 
          [jugadorId]: { 
            ...prev[jugadorId], 
            puntos: totalPuntosRef.current[jugadorId] 
          } 
        };
      });
    });

    socket.on("countdown", ({ count }: { count: number }) => {
      setCountdown(count);
    });

    socket.on("player-finished", () => {
      setTimeout(() => navigate("/mall/results"), 3000);
    });

    return () => {
      socket.off('connect', emitJoin)
      socket.off("players-update");
      socket.off("score-update");
      socket.off("countdown");
      socket.off("player-finished");
    };
  }, [socket, navigate]);

  
  const ordenados = Object.entries(scores)
    .filter(([id]) => id !== 'mall-screen')
    .sort(([, a], [, b]) => b.puntos - a.puntos);

  
  const totalPuntos = ordenados.reduce((sum, [, j]) => sum + j.puntos, 0);
  const BOARD_DOTS = 80;

  const dotsPerJugador: { color: string; count: number }[] = ordenados.map(([, j]) => ({
    color: j.color,
    count: totalPuntos > 0 ? Math.round((j.puntos / totalPuntos) * BOARD_DOTS) : 0,
  }));

  const allDots: string[] = [];
  dotsPerJugador.forEach(({ color, count }) => {
    for (let i = 0; i < count; i++) allDots.push(color);
  });
  
  while (allDots.length < BOARD_DOTS) allDots.push("#333");

  const getRankLabel = (index: number, total: number) => {
    if (total === 0) return '';
    if (index === 0) return '🥇 1er lugar';
    if (index === 1) return '🥈 2do lugar';
    if (index === 2) return '🥉 3er lugar';
    return 'No estás en el top 3';
  };

  return (
    <div className="mall-screen mall-shake">
      <div className="mall-pattern" aria-hidden />
      <MallHeader />

      <div className="mall-shake__top">
        <p className="mall-live-badge">¡JUEGO EN VIVO!</p>
        <span className="mall-mode-tag">SHAKE BATTLE</span>
      </div>

      {countdown !== null && countdown > 0 && (
        <div style={{ textAlign: 'center', fontSize: '1.5rem', color: '#a855f7', marginBottom: '0.5rem' }}>
          ⏳ El juego empieza en {countdown}s
        </div>
      )}

      <div className="mall-shake__layout">
        
        <aside>
          {ordenados.slice(1, 3).map(([id, j], i) => (
            <div key={id} className="mall-leader-card" style={{ borderColor: j.color }}>
              <p className="mall-leader-card__name">{j.nombre}</p>
              <p className="mall-leader-card__pts">{j.puntos.toLocaleString()} pts</p>
              <p className="mall-leader-card__rank">{getRankLabel(i + 1, ordenados.length)}</p>
            </div>
          ))}
        </aside>

        
        <div>
          {ordenados.length === 0 ? (
            <p className="mall-shake__empty">Esperando jugadores...</p>
          ) : (
            <div className="mall-board" aria-hidden>
              {allDots.map((color, i) => (
                <span
                  key={i}
                  className="mall-board__dot"
                  style={{ background: color }}
                />
              ))}
            </div>
          )}
          <div className="mall-shake__hint-box">
            ¡agita tu celular más fuerte!
          </div>
        </div>

        
        <aside>
          {[ordenados[0], ordenados[3]].filter(Boolean).map(([id, j], i) => (
            <div key={id} className="mall-leader-card" style={{ borderColor: j.color }}>
              <p className="mall-leader-card__name">{j.nombre}</p>
              <p className="mall-leader-card__pts">{j.puntos.toLocaleString()} pts</p>
              <p className="mall-leader-card__rank">
                {i === 0 ? getRankLabel(0, ordenados.length) : getRankLabel(3, ordenados.length)}
              </p>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
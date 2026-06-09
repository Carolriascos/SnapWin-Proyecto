import { useEffect, useRef, useState } from "react";
import { useSocket } from "../../hooks/useSocket";
import { useNavigate } from 'react-router-dom'
import MallHeader from '../../components/MallHeader'

interface JugadorScore {
  nombre: string;
  color: string;
  puntos: number;
}

const TOTAL_DOTS = 180;
const posicionesAleatorias = Array.from({ length: TOTAL_DOTS }, (_, i) => i)
  .sort(() => Math.random() - 0.5);

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
      });
    };
    if (socket.connected) emitJoin();
    else socket.on('connect', emitJoin);

    socket.on("players-update", (jugadores: any[]) => {
      setScores(prev => {
        const next: Record<string, JugadorScore> = {};
        jugadores.forEach(j => {
          if (j.id === 'mall-screen') return;
          next[j.id] = {
            nombre: j.nombre || "Jugador",
            color: j.color || "#888",
            puntos: prev[j.id]?.puntos ?? totalPuntosRef.current[j.id] ?? 0,
          };
        });
        return next;
      });
    });

    socket.on("score-update", ({ jugadorId, fuerza }: { jugadorId: string; fuerza: number }) => {
      totalPuntosRef.current[jugadorId] = (totalPuntosRef.current[jugadorId] ?? 0) + Math.round(fuerza);
      setScores(prev => {
        if (!prev[jugadorId]) return prev;
        return {
          ...prev,
          [jugadorId]: { ...prev[jugadorId], puntos: totalPuntosRef.current[jugadorId] }
        };
      });
    });

    socket.on("countdown", ({ count }: { count: number }) => setCountdown(count));
    socket.on("player-finished", () => setTimeout(() => navigate("/mall/results"), 4000));

    // Limpiar al iniciar nueva ronda
    socket.on("ranking-partida", (ranking: any[]) => {
      if (ranking.length === 0) {
        setScores({});
        totalPuntosRef.current = {};
      }
    });

    return () => {
      socket.off('connect', emitJoin);
      socket.off("players-update");
      socket.off("score-update");
      socket.off("countdown");
      socket.off("player-finished");
      socket.off("ranking-partida");
    };
  }, [socket, navigate]);

  const ordenados = Object.entries(scores)
    .filter(([id]) => id !== 'mall-screen')
    .sort(([, a], [, b]) => b.puntos - a.puntos);

  const totalPuntos = ordenados.reduce((s, [, j]) => s + j.puntos, 0);

  // Construir dots con posiciones aleatorias — vacío al inicio
  const dots: string[] = Array(TOTAL_DOTS).fill('empty');
  if (totalPuntos > 0) {
    let posIdx = 0;
    ordenados.forEach(([, j]) => {
      const count = Math.round((j.puntos / totalPuntos) * TOTAL_DOTS);
      for (let i = 0; i < count && posIdx < TOTAL_DOTS; i++, posIdx++) {
        dots[posicionesAleatorias[posIdx]] = j.color;
      }
    });
  }

  const getMedal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? '';

  return (
    <div className="mall-screen mall-shake">
      <div className="mall-pattern" aria-hidden />
      <MallHeader />

      <div className="mall-shake__top">
        <p className="mall-live-badge">¡JUEGO EN VIVO!</p>
        <span className="mall-mode-tag">SHAKE BATTLE</span>
      </div>

      {countdown !== null && countdown > 0 && (
        <div style={{ textAlign: 'center', fontSize: '1.4rem', color: '#a855f7', marginBottom: '0.5rem' }}>
          ⏳ El juego empieza en {countdown}s
        </div>
      )}

      <div className="mall-shake__layout">
        <aside>
          {ordenados.slice(1, 3).map(([id, j], i) => (
            <div key={id} className="mall-leader-card" style={{ borderColor: j.color }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: j.color, display: 'inline-block' }} />
                <p className="mall-leader-card__name">{j.nombre}</p>
              </div>
              <p className="mall-leader-card__pts">{j.puntos.toLocaleString()} pts</p>
              <p className="mall-leader-card__rank">{getMedal(i + 1)} {i === 0 ? '2do lugar' : '3er lugar'}</p>
            </div>
          ))}
        </aside>

        <div style={{ flex: 1 }}>
          <div className="mall-board" aria-hidden>
            {dots.map((color, i) => (
              <span
                key={i}
                className={`mall-board__dot${color !== 'empty' ? ' mall-board__dot--filled' : ''}`}
                style={{
                  background: color === 'empty' ? 'transparent' : color,
                  border: color === 'empty' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                }}
              />
            ))}
          </div>

          {ordenados.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {ordenados.slice(0, 3).map(([id, j], i) => (
                <div key={id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.05)', borderRadius: 8,
                  padding: '6px 14px', border: `1px solid ${j.color}`
                }}>
                  <span>{getMedal(i)}</span>
                  <span style={{ color: j.color, fontWeight: 'bold', fontSize: '0.9rem' }}>{j.nombre}</span>
                  <span style={{ color: '#ccc', fontSize: '0.85rem' }}>{j.puntos.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          )}

          <div className="mall-shake__hint-box" style={{ marginTop: '0.75rem' }}>
            ¡agita tu celular más fuerte!
          </div>
        </div>

        <aside>
          {ordenados[0] && (() => {
            const [id, j] = ordenados[0];
            return (
              <div key={id} className="mall-leader-card" style={{ borderColor: j.color }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: j.color, display: 'inline-block' }} />
                  <p className="mall-leader-card__name">{j.nombre}</p>
                </div>
                <p className="mall-leader-card__pts">{j.puntos.toLocaleString()} pts</p>
                <p className="mall-leader-card__rank">🥇 1er lugar</p>
              </div>
            );
          })()}
        </aside>
      </div>
    </div>
  );
}
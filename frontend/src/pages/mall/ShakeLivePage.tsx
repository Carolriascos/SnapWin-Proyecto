import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import MallHeader from '../../components/MallHeader';

interface JugadorScore {
  nombre: string;
  color: string;
  puntos: number;
}

interface BoardDot {
  id: string;
  color: string;
  x: number;
  y: number; 
}


const DOT_RADIUS_PCT = 2.6;
const MAX_ATTEMPTS   = 120;
const MARGIN         = DOT_RADIUS_PCT + 0.5;


function findFreePosition(
  existing: BoardDot[],
): { x: number; y: number } | null {
  const minDist = DOT_RADIUS_PCT * 2; 

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const x = MARGIN + Math.random() * (100 - MARGIN * 2);
    const y = MARGIN + Math.random() * (100 - MARGIN * 2);

    
    const overlaps = existing.some((d) => {
      const dx = d.x - x;
      const dy = d.y - y;
      const dist = Math.sqrt(dx * dx + (dy * dy * 4));
      return dist < minDist;
    });

    if (!overlaps) return { x, y };
  }

  return null;
}

export default function ShakeLivePage() {
  const socket   = useSocket();
  const navigate = useNavigate();

  const [scores,    setScores]    = useState<Record<string, JugadorScore>>({});
  const [dots,      setDots]      = useState<BoardDot[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  const totalPuntosRef   = useRef<Record<string, number>>({});
  const playerColorsRef  = useRef<Record<string, string>>({});
  const rankingRef       = useRef<{ jugadorId: string; nombre: string; puntos: number; color?: string }[]>([]);
  const dotsRef = useRef<BoardDot[]>([]);
  useEffect(() => { dotsRef.current = dots; }, [dots]);

  const resetBoard = (full = false) => {
    setDots([]);
    dotsRef.current = [];
    totalPuntosRef.current = {};
    rankingRef.current = [];
    if (full) {
      setScores({});
      playerColorsRef.current = {};
    } else {
      setScores(prev => {
        const next: Record<string, JugadorScore> = {};
        Object.entries(prev).forEach(([id, j]) => {
          next[id] = { ...j, puntos: 0 };
        });
        return next;
      });
    }
  };

  useEffect(() => {
    const emitJoin = () => {
      socket.emit('join-sala', {
        salaId: 'sala-001',
        jugador: { id: 'mall-screen', nombre: 'Mall' },
      });
    };
    if (socket.connected) emitJoin();
    else socket.on('connect', emitJoin);

    socket.on('players-update', (jugadores: any[]) => {
      setScores(prev => {
        const next: Record<string, JugadorScore> = {};
        jugadores.forEach(j => {
          if (j.id === 'mall-screen') return;
          playerColorsRef.current[j.id] = j.color || '#888';
          next[j.id] = {
            nombre: j.nombre || 'Jugador',
            color:  j.color  || '#888',
            puntos: prev[j.id]?.puntos ?? totalPuntosRef.current[j.id] ?? 0,
          };
        });
        return next;
      });
    });

    socket.on('score-update', ({ jugadorId, fuerza }: { jugadorId: string; fuerza: number }) => {
      totalPuntosRef.current[jugadorId] =
        (totalPuntosRef.current[jugadorId] ?? 0) + Math.round(fuerza);

      const color = playerColorsRef.current[jugadorId] ?? '#888';

      
      const pos = findFreePosition(dotsRef.current);

      if (pos) {
        const newDot: BoardDot = {
          id:    `${jugadorId}-${Date.now()}-${Math.random()}`,
          color,
          x: pos.x,
          y: pos.y,
        };
        setDots(prev => {
          const next = [...prev, newDot];
          dotsRef.current = next;
          return next;
        });
      }
      

      setScores(prev => {
        if (!prev[jugadorId]) return prev;
        return {
          ...prev,
          [jugadorId]: {
            ...prev[jugadorId],
            puntos: totalPuntosRef.current[jugadorId],
          },
        };
      });
    });

    socket.on('countdown', ({ count }: { count: number }) => setCountdown(count));

    socket.on('game-start', () => {
      resetBoard(false);
      setCountdown(null);
    });

    socket.on('player-finished', () => {
      setTimeout(
        () => navigate('/mall/results', { state: { ranking: rankingRef.current } }),
        4000,
      );
    });

    socket.on('ranking-partida', (ranking: any[]) => {
      if (ranking.length === 0) resetBoard(true);
      else rankingRef.current = ranking;
    });

    return () => {
      socket.off('connect', emitJoin);
      socket.off('players-update');
      socket.off('score-update');
      socket.off('countdown');
      socket.off('game-start');
      socket.off('player-finished');
      socket.off('ranking-partida');
    };
  }, [socket, navigate]);

  const ordenados = Object.entries(scores)
    .filter(([id]) => id !== 'mall-screen')
    .sort(([, a], [, b]) => b.puntos - a.puntos);

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
            {dots.map((dot) => (
              <span
                key={dot.id}
                className="mall-board__dot mall-board__dot--filled"
                style={{
                  left:       `${dot.x}%`,
                  top:        `${dot.y}%`,
                  background: dot.color,
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
                  padding: '6px 14px', border: `1px solid ${j.color}`,
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
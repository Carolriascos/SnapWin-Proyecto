import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSocket } from "../../hooks/useSocket";
import MallHeader from "../../components/MallHeader";

interface JugadorResult {
  jugadorId: string;
  nombre: string;
  puntos: number;
  color?: string;
}

export default function ResultsMallPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();
  const initialRanking = (location.state as { ranking?: JugadorResult[] } | null)?.ranking ?? [];
  const [resultados, setResultados] = useState<JugadorResult[]>(initialRanking);
  const [animando, setAnimando] = useState(false);

  useEffect(() => {
    socket.emit('join-sala', {
      salaId: 'sala-001',
      jugador: { id: 'mall-screen', nombre: 'Mall' }
    });

    socket.on("ranking-partida", (ranking: JugadorResult[]) => {
      if (ranking.length === 0) {
        setResultados([]);
        return;
      }
      setResultados(ranking);
      setAnimando(true);
      setTimeout(() => setAnimando(false), 600);
    });

    return () => {
      socket.off("ranking-partida");
    };
  }, [socket]);

  const ordenados = [...resultados].sort((a, b) => b.puntos - a.puntos);
  const medallas = ["🥇", "🥈", "🥉"];
  const podiumOrder = [1, 0, 2];

  return (
    <div className="mall-screen mall-results">
      <div className="mall-pattern" aria-hidden />
      <MallHeader />

      <h1 className="mall-results__title">WINNERS!</h1>

      <p className="mall-results__sub">
        {ordenados.length} jugador{ordenados.length !== 1 ? "es" : ""} en esta partida
      </p>

      {ordenados.length === 0 ? (
        <p className="mall-results__empty">Esperando resultados...</p>
      ) : (
        <div className="mall-results__columns">
          <section className="mall-results__section">
            <div className="mall-podium">
              {podiumOrder.map((idx) => {
                const j = ordenados[idx];
                if (!j) return null;
                return (
                  <div
                    key={j.jugadorId}
                    className={`mall-podium__place mall-podium__place--${idx + 1}`}
                    style={{ opacity: animando ? 0.85 : 1, borderColor: j.color }}
                  >
                    <span className="mall-podium__medal">{medallas[idx]}</span>
                    <span className="mall-podium__name">{j.nombre}</span>
                    <span className="mall-podium__pts">{j.puntos.toLocaleString()} pts</span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 400, margin: '1.5rem auto 0' }}>
              {ordenados.map((j, i) => (
                <div key={j.jugadorId} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(255,255,255,0.05)', borderRadius: 8,
                  padding: '8px 16px', border: `1px solid ${j.color ?? '#555'}`
                }}>
                  <span style={{ fontSize: '1.1rem' }}>{medallas[i] ?? `${i + 1}.`}</span>
                  {j.color && <span style={{ width: 10, height: 10, borderRadius: '50%', background: j.color, flexShrink: 0 }} />}
                  <span style={{ flex: 1, fontWeight: 'bold', fontSize: '0.95rem' }}>{j.nombre}</span>
                  <span style={{ color: '#a3e635', fontWeight: 800 }}>{j.puntos.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <button type="button" className="mall-btn-primary" onClick={() => navigate("/mall")} style={{ marginTop: '2rem' }}>
        Nueva ronda
      </button>
    </div>
  );
}

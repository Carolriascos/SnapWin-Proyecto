import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../hooks/useSocket";
import "../../styles/pages/admin/dashboard.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "";
const SALA_ID = "sala-001";

interface StatsDia {
  jugadores: number;
  partidas: number;
  puntajeMax: { valor: number; nombre: string };
  topJugadores: { nombre: string; puntos: number; color: string }[];
  juegosMasJugados: { nombre: string; porcentaje: number; color: string }[];
  cuponesGen: { valor: number; porcentajeCanje: number };
  cuponesPorNivel: { oro: number; plata: number; bronce: number; tasaCanje: number };
  cuponesList: { total: number; canjeados: number; pendientes: number; expirados: number };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const socket   = useSocket();
  const [rondaActiva, setRondaActiva] = useState(false);
  const [stats,       setStats]       = useState<StatsDia | null>(null);
  const [ultimaAct,   setUltimaAct]   = useState<string>("");
  const adminNombre = localStorage.getItem("adminNombre") ?? "Admin";

  useEffect(() => {
    if (!localStorage.getItem("adminLoggedIn")) navigate("/admin");
  }, [navigate]);

  const cargarStats = useCallback(async () => {
    try {
      const res  = await fetch(`${BACKEND}/scores/stats-hoy`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
        setUltimaAct(new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
    } catch (e) {
      console.error("Error cargando stats:", e);
    }
  }, []);

  useEffect(() => {
    cargarStats();
    const iv = setInterval(cargarStats, 30_000);
    return () => clearInterval(iv);
  }, [cargarStats]);


  useEffect(() => {
    const emitJoin = () => {
      socket.emit("join-sala", { salaId: SALA_ID, jugador: { id: "admin-panel", nombre: "Admin" } });
      socket.emit("pedir-stats");
    };
    if (socket.connected) emitJoin();
    else socket.on("connect", emitJoin);


    socket.on("stats-dia", (data: StatsDia) => {
      setStats(data);
      setUltimaAct(new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    });

    socket.on("player-finished", () => {
      setTimeout(cargarStats, 1000);
    });

    socket.on("player-finished", () => setRondaActiva(false));

    return () => {
      socket.off("connect", emitJoin);
      socket.off("stats-dia");
      socket.off("player-finished");
    };
  }, [socket, cargarStats]);

  const iniciarRonda = () => {
    socket.emit("admin-start-round", { salaId: SALA_ID });
    setRondaActiva(true);
  };

  const s = stats;

  return (
    <div className="dash-page">
      <div className="dash-bg" aria-hidden="true" />

      <div className="dash-location">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
        </svg>
        Chipichape Cali
      </div>

      <header className="dash-logo">
        <div className="dash-logo__wordmark">
          <span className="dash-logo__snap">snap</span>
          <span className="dash-logo__n"> n</span>
          <svg className="dash-logo__bolt" viewBox="0 0 18 22" fill="none">
            <path d="M11 2L3 13h7l-1.5 9L17 11h-7L11 2z" fill="#ff8c1a"/>
          </svg>
          <span className="dash-logo__win">win</span>
        </div>
        <p className="dash-logo__tagline">
          <span>live </span>
          <span className="dash-logo__exp">experience</span>
        </p>
      </header>

      <main className="dash-main">

        <div className="dash-section-title">
          <span>Estadísticas del día</span>
          <span className="dash-section-title__sep"> — </span>
          <span>hoy</span>
          {ultimaAct && (
            <span className="dash-section-title__live">
              🟢 Actualizado {ultimaAct}
            </span>
          )}
        </div>

        <div className="dash-metrics">
          <div className="dash-card dash-card--jugadores">
            <p className="dash-card__label">JUGADORES</p>
            <p className="dash-card__value dash-card__value--lime">
              {s?.jugadores ?? 0}
            </p>
            <p className="dash-card__sublabel">TOTAL HOY</p>
          </div>

          <div className="dash-card">
            <p className="dash-card__label">Puntaje máx.</p>
            <p className="dash-card__value dash-card__value--purple">
              {(s?.puntajeMax.valor ?? 0).toLocaleString()}
            </p>
            <p className="dash-card__sublabel">{s?.puntajeMax.nombre ?? "—"}</p>
          </div>

          <div className="dash-card">
            <p className="dash-card__label">Cupones gen.</p>
            <p className="dash-card__value dash-card__value--orange">
              {s?.cuponesGen.valor ?? 0}
            </p>
            <p className="dash-card__sublabel">{s?.cuponesGen.porcentajeCanje ?? 0}% canjeados</p>
          </div>

          <div className="dash-card">
            <p className="dash-card__label">Partidas hoy</p>
            <p className="dash-card__value">{s?.partidas ?? 0}</p>
            <p className="dash-card__sublabel dash-card__sublabel--small">JUGADAS</p>
          </div>
        </div>


        <div className="dash-mid-row">
          <div className="dash-card dash-card--games">
            <h3 className="dash-card__title">Juegos más jugados</h3>
            <div className="dash-games-list">
              {(s?.juegosMasJugados ?? [{ nombre: "Shake Battle", porcentaje: 0, color: "#a4ff00" }, { nombre: "Dodge Game", porcentaje: 0, color: "#c41e5a" }]).map((juego) => (
                <div key={juego.nombre} className="dash-game-item">
                  <span className="dash-game-item__name" style={{ color: juego.color }}>
                    {juego.nombre}
                  </span>
                  <div className="dash-game-item__bar-track">
                    <div
                      className="dash-game-item__bar-fill"
                      style={{ width: `${juego.porcentaje}%`, background: juego.color, transition: "width 0.6s ease" }}
                    />
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", minWidth: "2.5rem" }}>
                    {juego.porcentaje}%
                  </span>
                </div>
              ))}
            </div>

            <div className="dash-controls">
              <button
                className={`dash-btn-round ${rondaActiva ? "dash-btn-round--active" : ""}`}
                onClick={iniciarRonda}
                disabled={rondaActiva}
              >
                {rondaActiva ? "Ronda en curso…" : "Iniciar ronda"}
              </button>
              <button className="dash-btn-secondary" onClick={() => navigate("/admin/validate")}>
                Validar cupones
              </button>
            </div>
          </div>


          <div className="dash-card dash-card--top">
            <h3 className="dash-card__title">Top jugadores</h3>
            <div className="dash-top-list">
              {(s?.topJugadores ?? []).length === 0 ? (
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" }}>
                  Sin partidas aún hoy
                </p>
              ) : (
                s!.topJugadores.map((j, i) => (
                  <div key={i} className="dash-top-item">
                    <span
                      className="dash-top-item__name"
                      style={{ color: j.color ?? "inherit" }}
                    >
                      {j.nombre}
                    </span>
                    <span className="dash-top-item__score">{j.puntos.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>


        <div className="dash-card dash-card--coupons">
          <span className="dash-coupons__label">Cupones por nivel</span>

          <div className="dash-coupon-level">
            <p className="dash-coupon-level__name dash-coupon-level__name--oro">Oro</p>
            <p className="dash-coupon-level__value dash-coupon-level__value--oro">
              {s?.cuponesPorNivel.oro ?? 0}
            </p>
            <p className="dash-coupon-level__personas">Personas</p>
          </div>

          <div className="dash-coupon-level">
            <p className="dash-coupon-level__name">Plata</p>
            <p className="dash-coupon-level__value">{s?.cuponesPorNivel.plata ?? 0}</p>
            <p className="dash-coupon-level__personas">Personas</p>
          </div>

          <div className="dash-coupon-level">
            <p className="dash-coupon-level__name dash-coupon-level__name--bronce">Bronce</p>
            <p className="dash-coupon-level__value dash-coupon-level__value--bronce">
              {s?.cuponesPorNivel.bronce ?? 0}
            </p>
            <p className="dash-coupon-level__personas">Personas</p>
          </div>

          <div className="dash-coupon-tasa">
            <p className="dash-coupon-tasa__label">Tasa canje</p>
            <p className="dash-coupon-tasa__value">{s?.cuponesPorNivel.tasaCanje ?? 0}%</p>
          </div>
        </div>


        <div className="dash-card" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", textAlign: "center" }}>
          {[
            { label: "Total generados", valor: s?.cuponesList.total ?? 0, color: "#7c3aed" },
            { label: "Canjeados",       valor: s?.cuponesList.canjeados ?? 0,  color: "#a4ff00" },
            { label: "Pendientes",      valor: s?.cuponesList.pendientes ?? 0, color: "#ff8c1a" },
            { label: "Expirados",       valor: s?.cuponesList.expirados ?? 0,  color: "#666" },
          ].map(({ label, valor, color }) => (
            <div key={label}>
              <p style={{ fontSize: "1.8rem", fontWeight: 900, color }}>{valor}</p>
              <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        <button
          className="dash-logout"
          onClick={() => { localStorage.removeItem("adminLoggedIn"); navigate("/admin"); }}
        >
          Cerrar sesión
        </button>
      </main>
    </div>
  );
}
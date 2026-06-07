import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../hooks/useSocket";
import "../../styles/pages/admin/dashboard.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "";
const SALA_ID = "sala-001";

interface Jugador {
  id: string;
  nombre: string;
  puntos: number;
  juego?: string;
}

interface Stats {
  totalJugadores: number;
  totalRondas: number;
  topJugadores: { nombre: string; puntos: number; juego: string }[];
}


const MOCK_STATS = {
  jugadores: 247,
  puntajeMax: { valor: 4820, nombre: "María G." },
  cuponesGen: { valor: 183, porcentajeCanje: 74 },
  partidasAct: { valor: 12 },
  juegosMasJugados: [
    { nombre: "Shake Battle", porcentaje: 72, color: "#a4ff00" },
    { nombre: "Dodge Game",   porcentaje: 55, color: "#c41e5a" },
  ],
  topJugadores: [
    { nombre: "María G.",      puntos: 4820 },
    { nombre: "Fulanito D.",   puntos: 3210 },
    { nombre: "Andrea S.",     puntos: 2847 },
    { nombre: "Ana Sofía R.",  puntos: 2540 },
  ],
  cuponesPorNivel: {
    oro: 38, plata: 79, bronce: 66, tasaCanje: 74,
  },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const socket   = useSocket();
  const [rondaActiva,    setRondaActiva]    = useState(false);
  const [jugadoresVivos, setJugadoresVivos] = useState<Jugador[]>([]);
  const [stats,          setStats]          = useState<Stats | null>(null);
  const adminNombre = localStorage.getItem("adminNombre") ?? "Admin";

  useEffect(() => {
    if (!localStorage.getItem("adminLoggedIn")) navigate("/admin");
  }, [navigate]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res  = await fetch(`${BACKEND}/scores/ranking/${SALA_ID}`);
        const data = await res.json();
        if (data.success) {
          setStats({
            totalJugadores: data.data.length,
            totalRondas: 1,
            topJugadores: data.data.slice(0, 5).map((j: any) => ({
              nombre: j.jugadores?.nombre ?? "Jugador",
              puntos: j.puntos,
              juego:  j.juego ?? "shake",
            })),
          });
        }
      } catch (e) {
        console.error("Error cargando stats:", e);
      }
    };
    cargar();
  }, []);

  useEffect(() => {
    const emitJoin = () => {
      socket.emit("join-sala", { salaId: SALA_ID, jugador: { id: "admin-panel", nombre: "Admin" } });
    };
    if (socket.connected) emitJoin();
    else socket.on("connect", emitJoin);

    socket.on("players-update", (jugadores: any[]) => {
      setJugadoresVivos(
        jugadores
          .filter(j => j.id !== "admin-panel" && j.id !== "mall-screen")
          .map(j => ({ id: j.id, nombre: j.nombre || "Jugador", puntos: 0 }))
      );
    });

    socket.on("score-update", ({ jugadorId, fuerza }: { jugadorId: string; fuerza: number }) => {
      setJugadoresVivos(prev =>
        prev.map(j => j.id === jugadorId ? { ...j, puntos: j.puntos + Math.round(fuerza) } : j)
      );
    });

    socket.on("player-finished", () => setRondaActiva(false));

    return () => {
      socket.off("connect", emitJoin);
      socket.off("players-update");
      socket.off("score-update");
      socket.off("player-finished");
    };
  }, [socket]);

  const iniciarRonda = () => {
    socket.emit("admin-start-round", { salaId: SALA_ID });
    setRondaActiva(true);
  };

  
  const topJugadores = stats?.topJugadores.length
    ? stats.topJugadores.map(j => ({ nombre: j.nombre, puntos: j.puntos }))
    : MOCK_STATS.topJugadores;

  const totalJugadores = stats?.totalJugadores ?? MOCK_STATS.jugadores;

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
        </div>


        <div className="dash-metrics">
          {/* Jugadores */}
          <div className="dash-card dash-card--jugadores">
            <p className="dash-card__label">JUGADORES</p>
            <p className="dash-card__value dash-card__value--lime">{totalJugadores.toLocaleString()}</p>
            <p className="dash-card__sublabel">TOTAL</p>
          </div>

          
          <div className="dash-card">
            <p className="dash-card__label">Puntaje máx.</p>
            <p className="dash-card__value dash-card__value--purple">
              {MOCK_STATS.puntajeMax.valor.toLocaleString()}
            </p>
            <p className="dash-card__sublabel">{MOCK_STATS.puntajeMax.nombre}</p>
          </div>

          
          <div className="dash-card">
            <p className="dash-card__label">Cupones gen.</p>
            <p className="dash-card__value dash-card__value--orange">
              {MOCK_STATS.cuponesGen.valor}
            </p>
            <p className="dash-card__sublabel">{MOCK_STATS.cuponesGen.porcentajeCanje}% canjeados</p>
          </div>

          
          <div className="dash-card">
            <p className="dash-card__label">Partidas act.</p>
            <p className="dash-card__value">{jugadoresVivos.length || MOCK_STATS.partidasAct.valor}</p>
            <p className="dash-card__sublabel dash-card__sublabel--small">pARTICIPANTES</p>
          </div>
        </div>

        
        <div className="dash-mid-row">
          
          <div className="dash-card dash-card--games">
            <h3 className="dash-card__title">Juegos más jugados</h3>
            <div className="dash-games-list">
              {MOCK_STATS.juegosMasJugados.map((juego) => (
                <div key={juego.nombre} className="dash-game-item">
                  <span className="dash-game-item__name" style={{ color: juego.color }}>
                    {juego.nombre}
                  </span>
                  <div className="dash-game-item__bar-track">
                    <div
                      className="dash-game-item__bar-fill"
                      style={{ width: `${juego.porcentaje}%`, background: juego.color }}
                    />
                  </div>
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
              {topJugadores.map((j, i) => (
                <div key={i} className="dash-top-item">
                  <span className="dash-top-item__name">{j.nombre}</span>
                  <span className="dash-top-item__score">{j.puntos.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        
        <div className="dash-card dash-card--coupons">
          <span className="dash-coupons__label">Cupones por nivel</span>

          <div className="dash-coupon-level">
            <p className="dash-coupon-level__name dash-coupon-level__name--oro">Oro</p>
            <p className="dash-coupon-level__value dash-coupon-level__value--oro">
              {MOCK_STATS.cuponesPorNivel.oro}
            </p>
            <p className="dash-coupon-level__personas">Personas</p>
          </div>

          <div className="dash-coupon-level">
            <p className="dash-coupon-level__name">Plata</p>
            <p className="dash-coupon-level__value">{MOCK_STATS.cuponesPorNivel.plata}</p>
            <p className="dash-coupon-level__personas">Personas</p>
          </div>

          <div className="dash-coupon-level">
            <p className="dash-coupon-level__name dash-coupon-level__name--bronce">Bronce</p>
            <p className="dash-coupon-level__value dash-coupon-level__value--bronce">
              {MOCK_STATS.cuponesPorNivel.bronce}
            </p>
            <p className="dash-coupon-level__personas">Personas</p>
          </div>

          <div className="dash-coupon-tasa">
            <p className="dash-coupon-tasa__label">Tasa canje</p>
            <p className="dash-coupon-tasa__value">{MOCK_STATS.cuponesPorNivel.tasaCanje}%</p>
          </div>
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
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../hooks/useSocket";
import "../../styles/pages/admin/validate.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "";
const SALA_ID = "sala-001";

interface Cupon {
  codigo: string;
  jugador: string;
  hora: string;
  nivel: string;
  juego: string;
  estado: "Canjeado" | "Pendiente" | "Expirado";
}

interface InfoCupon {
  codigo: string;
  created_at: string;
  expires_at: string;
  estadoActual: string;
  jugador: string;
  nivel: string;
  descuento: number;
  canjeado_at?: string | null;
}

interface Stats {
  totalGenerados: number;
  canjeados: number;
  pendientes: number;
  expirados: number;
}

type ResultColor = "green" | "yellow" | "red";

const formatFecha = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ValidatePage() {
  const navigate = useNavigate();
  const socket   = useSocket();

  const [cupones,       setCupones]       = useState<Cupon[]>([]);
  const [stats,         setStats]         = useState<Stats>({ totalGenerados: 0, canjeados: 0, pendientes: 0, expirados: 0 });
  const [cargandoLista, setCargandoLista] = useState(true);

  const [codigo,    setCodigo]    = useState("");
  const [resultado, setResultado] = useState<string | null>(null);
  const [colorRes,  setColorRes]  = useState<ResultColor>("green");
  const [cargando,  setCargando]  = useState(false);
  const [infoCupon, setInfoCupon] = useState<InfoCupon | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("adminLoggedIn")) navigate("/admin");
  }, [navigate]);

  const cargarCupones = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken") ?? "";
      const res  = await fetch(`${BACKEND}/coupons/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("adminLoggedIn");
        localStorage.removeItem("adminToken");
        navigate("/admin");
        return;
      }

      const data = await res.json();

      if (data.success && data.data) {
        const lista: Cupon[] = data.data.cupones ?? data.data;
        const statsApi: Stats = data.data.stats ?? {
          totalGenerados: lista.length,
          canjeados:  lista.filter((c) => c.estado === "Canjeado").length,
          pendientes: lista.filter((c) => c.estado === "Pendiente").length,
          expirados:  lista.filter((c) => c.estado === "Expirado").length,
        };
        setCupones(lista);
        setStats(statsApi);
      }
    } catch (e) {
      console.error("Error cargando cupones:", e);
    } finally {
      setCargandoLista(false);
    }
  }, [navigate]);

  useEffect(() => {
    cargarCupones();
    const intervalo = setInterval(cargarCupones, 10_000);
    return () => clearInterval(intervalo);
  }, [cargarCupones]);

  useEffect(() => {
    const emitJoin = () => {
      socket.emit("join-sala", { salaId: SALA_ID, jugador: { id: "admin-panel", nombre: "Admin" } });
    };
    if (socket.connected) emitJoin();
    else socket.on("connect", emitJoin);

    const actualizar = () => setTimeout(cargarCupones, 400);
    socket.on("partida-finalizada", actualizar);
    socket.on("player-finished",    actualizar);
    socket.on("cupon-actualizado",  actualizar);
    socket.on("stats-dia",          actualizar);

    return () => {
      socket.off("connect", emitJoin);
      socket.off("partida-finalizada", actualizar);
      socket.off("player-finished",    actualizar);
      socket.off("cupon-actualizado",  actualizar);
      socket.off("stats-dia",          actualizar);
    };
  }, [socket, cargarCupones]);

  const resetear = () => {
    setCodigo("");
    setResultado(null);
    setInfoCupon(null);
    setModalOpen(false);
  };

  const mostrarDetalle = (coupon: any) => {
    setInfoCupon({
      codigo:       coupon.codigo,
      created_at:   coupon.created_at,
      expires_at:   coupon.expires_at,
      estadoActual: coupon.estadoActual ?? coupon.estado ?? "-",
      jugador:      coupon.jugador ?? coupon.jugadores?.nombre ?? "Sin asignar",
      nivel:        coupon.nivel,
      descuento:    coupon.descuento,
      canjeado_at:  coupon.canjeado_at,
    });
  };

  const validar = async () => {
    if (!codigo.trim()) return;
    setCargando(true);
    setResultado("Verificando...");
    setInfoCupon(null);
    const upper = codigo.trim().toUpperCase();
    const token = localStorage.getItem("adminToken") ?? "";

    try {
      const res  = await fetch(`${BACKEND}/coupons/validate/${upper}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("adminLoggedIn");
        localStorage.removeItem("adminToken");
        navigate("/admin");
        return;
      }

      const data = await res.json();

      if (!data.success) {
        setResultado("❌ Error del servidor");
        setColorRes("red");
        return;
      }

      const { valido, estado, mensaje, coupon } = data.data;

      if (estado === "no_encontrado") {
        setResultado(mensaje);
        setColorRes("red");
        return;
      }

      if (estado === "canjeado") {
        setResultado(mensaje);
        setColorRes("yellow");
        mostrarDetalle(coupon);
        return;
      }

      if (estado === "expirado") {
        setResultado(mensaje);
        setColorRes("yellow");
        mostrarDetalle(coupon);
        return;
      }

      if (!valido) {
        setResultado(mensaje ?? "❌ Cupón no válido");
        setColorRes("red");
        return;
      }

      mostrarDetalle(coupon);
      setResultado(mensaje);

      const redeem = await fetch(`${BACKEND}/coupons/redeem/${upper}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const rd = await redeem.json();

      if (rd.success) {
        setColorRes("green");
        setInfoCupon((prev) => prev ? { ...prev, estadoActual: "Canjeado", canjeado_at: new Date().toISOString() } : prev);
        setCodigo("");
        socket.emit("cupon-canjeado", { salaId: SALA_ID, codigo: upper });
        await cargarCupones();
      } else {
        setResultado(`❌ Error al canjear: ${rd.error}`);
        setColorRes("red");
      }
    } catch {
      setResultado("❌ Sin conexión al servidor");
      setColorRes("red");
    } finally {
      setCargando(false);
    }
  };

  const nivelClass  = (n: string) => n === "Oro" ? "val-nivel--oro" : n === "Bronce" ? "val-nivel--bronce" : "";
  const estadoClass = (e: string) => e === "Canjeado" ? "val-estado--canjeado" : e === "Pendiente" ? "val-estado--pendiente" : "val-estado--expirado";

  return (
    <div className="val-page">
      <div className="val-bg" aria-hidden="true" />

      <div className="val-location">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
        </svg>
        Chipichape Cali
      </div>

      <header className="val-logo">
        <div className="val-logo__wordmark">
          <span className="val-logo__snap">snap</span>
          <span className="val-logo__n"> n</span>
          <svg className="val-logo__bolt" viewBox="0 0 18 22" fill="none">
            <path d="M11 2L3 13h7l-1.5 9L17 11h-7L11 2z" fill="#ff8c1a"/>
          </svg>
          <span className="val-logo__win">win</span>
        </div>
        <p className="val-logo__tagline">
          <span>live </span>
          <span className="val-logo__exp">experience</span>
        </p>
      </header>

      <main className="val-main">
        <div className="val-top-row">
          <h1 className="val-title">Cupones</h1>
          <div className="val-top-actions">
            <button className="val-btn-validate" onClick={() => setModalOpen(true)}>
              + Validar cupón
            </button>
            <button className="val-btn-back" onClick={() => navigate("/admin/dashboard")}>
              ← Dashboard
            </button>
          </div>
        </div>

        <div className="val-summary">
          {[
            { label: "Total generados", val: stats.totalGenerados },
            { label: "Canjeados",       val: stats.canjeados },
            { label: "Pendientes",      val: stats.pendientes },
            { label: "Expirados",       val: stats.expirados },
          ].map(({ label, val }) => (
            <div key={label} className="val-summary-card">
              <p className="val-summary-card__value">{val}</p>
              <p className="val-summary-card__label">{label}</p>
            </div>
          ))}
        </div>

        <div className="val-table-wrap">
          {cargandoLista ? (
            <p style={{ color: "#888", textAlign: "center", padding: "2rem" }}>Cargando cupones…</p>
          ) : cupones.length === 0 ? (
            <p style={{ color: "#888", textAlign: "center", padding: "2rem" }}>No hay cupones registrados aún.</p>
          ) : (
            <table className="val-table">
              <thead>
                <tr>
                  <th>Código</th><th>Jugador</th><th>Hora</th>
                  <th>Nivel</th><th>Juego</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {cupones.map((c) => (
                  <tr key={c.codigo}>
                    <td className="val-td--code">{c.codigo}</td>
                    <td>{c.jugador}</td>
                    <td>{c.hora}</td>
                    <td className={`val-nivel ${nivelClass(c.nivel)}`}>{c.nivel}</td>
                    <td>{c.juego}</td>
                    <td className={`val-estado ${estadoClass(c.estado)}`}>{c.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {modalOpen && (
        <div className="val-modal-overlay" onClick={() => !cargando && resetear()}>
          <div className="val-modal" onClick={(e) => e.stopPropagation()}>
            <button className="val-modal__close" onClick={resetear} disabled={cargando}>✕</button>
            <h2 className="val-modal__title">Validar Cupón</h2>
            <p className="val-modal__subtitle">Ingresa el código que muestra el cliente</p>
            <input
              className="val-modal__input"
              placeholder="Ej: FP-ABCD-XY"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && validar()}
              disabled={cargando}
              autoFocus
            />
            <button
              className="val-modal__btn"
              onClick={validar}
              disabled={cargando || !codigo.trim()}
            >
              {cargando ? "Verificando…" : "Verificar y canjear"}
            </button>

            {resultado && resultado !== "Verificando..." && (
              <div className={`val-modal__result val-modal__result--${colorRes}`}>
                <p className="val-modal__result-title">{resultado}</p>
                {infoCupon && (
                  <div className="val-modal__result-detail">
                    <p>Código: <strong>{infoCupon.codigo}</strong></p>
                    <p>Fecha de creación: {formatFecha(infoCupon.created_at)}</p>
                    <p>Fecha de expiración: {formatFecha(infoCupon.expires_at)}</p>
                    <p>Estado actual: <strong>{infoCupon.estadoActual}</strong></p>
                    <p>Usuario asociado: <strong>{infoCupon.jugador}</strong></p>
                    {infoCupon.canjeado_at && (
                      <p>Fecha de canje: {formatFecha(infoCupon.canjeado_at)}</p>
                    )}
                    {colorRes === "green" && (
                      <p>Nivel: <strong>{infoCupon.nivel}</strong> — Descuento: <strong>{infoCupon.descuento}%</strong></p>
                    )}
                  </div>
                )}
                <button className="val-modal__reset" onClick={resetear}>
                  Validar otro cupón
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

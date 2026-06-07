import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/pages/admin/validate.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "";

interface Cupon {
  codigo: string;
  jugador: string;
  hora: string;
  nivel: string;
  juego: string;
  estado: "Canjeado" | "Pendiente" | "Expirado";
}

interface InfoCupon {
  nivel: string;
  descuento: number;
  canjeado: boolean;
  expires_at: string;
}

interface Stats {
  totalGenerados: number;
  canjeados: number;
  pendientes: number;
  expirados: number;
}

export default function ValidatePage() {
  const navigate = useNavigate();

  const [cupones,      setCupones]      = useState<Cupon[]>([]);
  const [stats,        setStats]        = useState<Stats>({ totalGenerados: 0, canjeados: 0, pendientes: 0, expirados: 0 });
  const [cargandoLista, setCargandoLista] = useState(true);

  const [codigo,    setCodigo]    = useState("");
  const [resultado, setResultado] = useState<string | null>(null);
  const [colorRes,  setColorRes]  = useState<"green" | "red">("green");
  const [cargando,  setCargando]  = useState(false);
  const [infoCupon, setInfoCupon] = useState<InfoCupon | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("adminLoggedIn")) navigate("/admin");
  }, [navigate]);

  
  const cargarCupones = useCallback(async () => {
    try {
      const res  = await fetch(`${BACKEND}/coupons/list`);
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        const lista: Cupon[] = data.data;
        setCupones(lista);
        setStats({
          totalGenerados: lista.length,
          canjeados:  lista.filter((c) => c.estado === "Canjeado").length,
          pendientes: lista.filter((c) => c.estado === "Pendiente").length,
          expirados:  lista.filter((c) => c.estado === "Expirado").length,
        });
      }
    } catch (e) {
      console.error("Error cargando cupones:", e);
    } finally {
      setCargandoLista(false);
    }
  }, []);

  
  useEffect(() => {
    cargarCupones();
    const intervalo = setInterval(cargarCupones, 5000);
    return () => clearInterval(intervalo);
  }, [cargarCupones]);

  
  const resetear = () => {
    setCodigo("");
    setResultado(null);
    setInfoCupon(null);
    setModalOpen(false);
  };

  
  const validar = async () => {
    if (!codigo.trim()) return;
    setCargando(true);
    setResultado("Verificando...");
    setInfoCupon(null);
    const upper = codigo.trim().toUpperCase();

    try {
      const res  = await fetch(`${BACKEND}/coupons/validate/${upper}`);
      const data = await res.json();

      if (!data.success) {
        setResultado("Error del servidor");
        setColorRes("red");
        return;
      }

      const { valido, motivo, coupon } = data.data;

      if (!valido) {
        setResultado(`NO VÁLIDO: ${motivo}`);
        setColorRes("red");
        return;
      }

      const redeem = await fetch(`${BACKEND}/coupons/redeem/${upper}`, { method: "PATCH" });
      const rd     = await redeem.json();

      if (rd.success) {
        setResultado("CANJEADO EXITOSAMENTE");
        setColorRes("green");
        setInfoCupon({
          nivel:      coupon.nivel,
          descuento:  coupon.descuento,
          canjeado:   true,
          expires_at: coupon.expires_at,
        });
        setCodigo("");


        await cargarCupones();
      } else {
        setResultado(`Error al canjear: ${rd.error}`);
        setColorRes("red");
      }
    } catch {
      setResultado("Sin conexión al servidor");
      setColorRes("red");
    } finally {
      setCargando(false);
    }
  };

  
  const nivelClass = (nivel: string) => {
    if (nivel === "Oro")    return "val-nivel--oro";
    if (nivel === "Bronce") return "val-nivel--bronce";
    return "";
  };

  const estadoClass = (estado: string) => {
    if (estado === "Canjeado")  return "val-estado--canjeado";
    if (estado === "Pendiente") return "val-estado--pendiente";
    if (estado === "Expirado")  return "val-estado--expirado";
    return "";
  };

  
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
          <div className="val-summary-card">
            <p className="val-summary-card__value">{stats.totalGenerados}</p>
            <p className="val-summary-card__label">Total generados</p>
          </div>
          <div className="val-summary-card">
            <p className="val-summary-card__value">{stats.canjeados}</p>
            <p className="val-summary-card__label">Canjeados</p>
          </div>
          <div className="val-summary-card">
            <p className="val-summary-card__value">{stats.pendientes}</p>
            <p className="val-summary-card__label">Pendientes</p>
          </div>
          <div className="val-summary-card">
            <p className="val-summary-card__value">{stats.expirados}</p>
            <p className="val-summary-card__label">Expirados</p>
          </div>
        </div>

        
        <div className="val-table-wrap">
          {cargandoLista ? (
            <p style={{ color: "#888", textAlign: "center", padding: "2rem" }}>
              Cargando cupones…
            </p>
          ) : cupones.length === 0 ? (
            <p style={{ color: "#888", textAlign: "center", padding: "2rem" }}>
              No hay cupones registrados aún.
            </p>
          ) : (
            <table className="val-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Jugador</th>
                  <th>Hora</th>
                  <th>Nivel</th>
                  <th>Juego</th>
                  <th>Estado</th>
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
              placeholder="Ej: SNW-0847"
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
                    <p>Nivel: <strong>{infoCupon.nivel}</strong></p>
                    <p>Descuento: <strong>{infoCupon.descuento}%</strong></p>
                    <p>Vencía: {new Date(infoCupon.expires_at).toLocaleDateString()}</p>
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
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useSocket } from "../../hooks/useSocket"

interface JugadorResult {
  jugadorId: string
  nombre: string
  puntos: number
  color?: string
}

const GAME_LABELS: Record<string, string> = {
  shake: "SHAKE BATTLE",
  dodge: "DODGE GAME",
}

export default function ResultsMallPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const socket    = useSocket()

  const stateData      = location.state as { ranking?: JugadorResult[]; game?: string } | null
  const initialRanking = stateData?.ranking ?? []
  const initialGame    = stateData?.game ?? "shake"

  const [resultados, setResultados] = useState<JugadorResult[]>(initialRanking)
  const [gameMode,   setGameMode]   = useState(initialGame)

  useEffect(() => {
    const emitJoin = () => {
      socket.emit("join-sala", { salaId: "sala-001", jugador: { id: "mall-screen", nombre: "Mall" } })
    }
    if (socket.connected) emitJoin()
    else socket.on("connect", emitJoin)

    socket.on("ranking-partida", (ranking: JugadorResult[]) => {
      if (ranking.length === 0) { setResultados([]); return }
      setResultados(ranking)
    })
    socket.on("game-start", ({ game }: { game?: string }) => { if (game) setGameMode(game) })
    socket.on("round-reset", () => {
      setResultados([])
      navigate("/mall/waiting")
    })
    return () => {
      socket.off("connect", emitJoin)
      socket.off("ranking-partida")
      socket.off("game-start")
      socket.off("round-reset")
    }
  }, [socket, navigate])

  const ordenados   = [...resultados].sort((a, b) => b.puntos - a.puntos)
  const top3        = ordenados.slice(0, 3)
  const gameLabel   = GAME_LABELS[gameMode] ?? "SHAKE BATTLE"

  const podiumSlots = [
    { idx: 1, height: 140, medal: "🥈", label: "2°" },
    { idx: 0, height: 180, medal: "🥇", label: "1°" },
    { idx: 2, height: 110, medal: "🥉", label: "3°" },
  ]

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a12", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"0 20px 40px",
      position:"relative", overflow:"hidden", fontFamily:"'Barlow', system-ui, sans-serif" }}>

      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        backgroundImage:"radial-gradient(circle, rgba(124,58,237,0.18) 1px, transparent 1px)",
        backgroundSize:"22px 22px" }} />

      <div style={{ position:"fixed", top:"20%", left:"50%", transform:"translateX(-50%)",
        width:500, height:400, zIndex:0, pointerEvents:"none",
        background:"radial-gradient(ellipse, rgba(100,60,220,0.22) 0%, transparent 65%)" }} />

      <p style={{ position:"relative", zIndex:1, fontSize:"0.8rem", color:"#666", marginBottom:8 }}>
        📍 Chipichape Cali
      </p>

      <div style={{ position:"relative", zIndex:1, textAlign:"center", marginBottom:8 }}>
        <span style={{ fontWeight:900, fontSize:"1.6rem", color:"#fff" }}>snap n</span>
        <span style={{ fontWeight:900, fontSize:"1.6rem", color:"#e8480a" }}>⚡</span>
        <span style={{ fontWeight:900, fontSize:"1.6rem", color:"#22c55e" }}>win</span>
        <p style={{ fontSize:"0.8rem", color:"#e53170", letterSpacing:"2px", margin:"2px 0 0" }}>
          live experience
        </p>
      </div>

      <h1 style={{ position:"relative", zIndex:1,
        fontSize:"clamp(3rem, 10vw, 5.5rem)", fontWeight:900, color:"#e8f5c8",
        letterSpacing:"2px", margin:"8px 0 16px",
        textShadow:"0 0 40px rgba(164,255,0,0.25)", textAlign:"center" }}>
        WINNERS!
      </h1>

      <div style={{ position:"relative", zIndex:1, border:"1.5px solid rgba(232,72,10,0.6)",
        borderRadius:8, padding:"6px 22px", fontSize:"0.9rem", fontWeight:700,
        letterSpacing:"2px", color:"#fff", background:"rgba(232,72,10,0.08)", marginBottom:32 }}>
        {gameLabel}
      </div>

      {ordenados.length === 0 ? (
        <p style={{ position:"relative", zIndex:1, color:"#666", fontSize:"1.1rem" }}>
          Esperando resultados...
        </p>
      ) : (
        <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"flex-end",
          justifyContent:"center", gap:16, width:"100%", maxWidth:600 }}>
          {podiumSlots.map(({ idx, height, medal, label }) => {
            const j = top3[idx]
            if (!j) return <div key={idx} style={{ width:160 }} />
            const isFirst = idx === 0
            return (
              <div key={j.jugadorId} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                <p style={{ fontSize: isFirst ? "1rem" : "0.88rem", fontWeight:700, color:"#fff",
                  textAlign:"center", maxWidth:140, lineHeight:1.3 }}>
                  {j.nombre} {medal}
                </p>
                <p style={{ fontSize:"0.75rem", color:"#a4ff00", fontWeight:600, marginBottom:4 }}>
                  {j.puntos.toLocaleString()} pts
                </p>
                <div style={{ width: isFirst ? 160 : 130, height,
                  background: isFirst
                    ? "linear-gradient(180deg, rgba(124,58,237,0.5) 0%, rgba(60,20,120,0.8) 100%)"
                    : "rgba(40,30,70,0.9)",
                  border:`1.5px solid ${j.color ?? "rgba(124,58,237,0.4)"}`,
                  borderRadius:"8px 8px 0 0", display:"flex", alignItems:"center",
                  justifyContent:"center", flexDirection:"column", gap:6 }}>
                  <span style={{ fontSize: isFirst ? "2rem" : "1.5rem" }}>{medal}</span>
                  <span style={{ fontSize: isFirst ? "1.4rem" : "1.1rem", fontWeight:900, color: j.color ?? "#fff" }}>
                    {label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {ordenados.length > 0 && (
        <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:600, height:8,
          background:"rgba(124,58,237,0.3)", borderRadius:"0 0 4px 4px", marginBottom:32 }} />
      )}

      <button type="button" onClick={() => navigate("/mall")}
        style={{ position:"relative", zIndex:1, background:"#7c3aed", border:"none",
          borderRadius:50, padding:"14px 48px", color:"#fff", fontFamily:"inherit",
          fontWeight:900, fontSize:"1rem", letterSpacing:"2px", textTransform:"uppercase",
          cursor:"pointer", marginTop:8, boxShadow:"0 6px 28px rgba(124,58,237,0.5)" }}>
        Nueva ronda
      </button>
    </div>
  )
}
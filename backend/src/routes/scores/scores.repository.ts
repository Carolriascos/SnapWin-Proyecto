import { SupabaseClient } from "../../clients/SupabaseClient"
import { ScorePayload, ApiResponse } from "../../types/types"

const inicioDia = (): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const y = parts.find((p) => p.type === "year")!.value
  const m = parts.find((p) => p.type === "month")!.value
  const d = parts.find((p) => p.type === "day")!.value
  return new Date(`${y}-${m}-${d}T00:00:00-05:00`).toISOString()
}

const getTop3 = async (salaId: string): Promise<ApiResponse<any[]>> => {
  const desde = inicioDia()

  const { data, error } = await SupabaseClient
    .from("partidas")
    .select("jugador_id, puntos, juego, jugadores(nombre, color)")
    .eq("sala_id", salaId)
    .gte("created_at", desde)
    .order("puntos", { ascending: false })
    .limit(20)

  if (error) {
    console.error("Error al obtener ranking:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

const saveScore = async (payload: ScorePayload): Promise<ApiResponse<any>> => {
  const { data, error } = await SupabaseClient
    .from("partidas")
    .upsert({
      jugador_id: payload.jugadorId,
      juego:      payload.juego,
      sala_id:    payload.salaId,
      puntos:     payload.puntos,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("Error al guardar puntaje:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

const getStatsDia = async (): Promise<ApiResponse<any>> => {
  const desde = inicioDia()

  const { data: partidas, error: errPartidas } = await SupabaseClient
    .from("partidas")
    .select("jugador_id, puntos, juego, created_at, jugadores(nombre, color)")
    .gte("created_at", desde)
    .order("puntos", { ascending: false })

  if (errPartidas) return { success: false, error: errPartidas.message }

  const { data: cupones, error: errCupones } = await SupabaseClient
    .from("cupones")
    .select("nivel, canjeado, expires_at, created_at")
    .gte("created_at", desde)

  if (errCupones) return { success: false, error: errCupones.message }

  const rows = partidas ?? []
  const cups = cupones ?? []
  const now = new Date()

  const jugadoresUnicos = new Set(rows.map((r: any) => r.jugador_id))

  const primerRow = rows[0] as any
  const puntajeMax = primerRow
    ? { valor: primerRow.puntos as number, nombre: (primerRow.jugadores?.nombre ?? "?") as string }
    : { valor: 0, nombre: "-" }

  const porJugador: Record<string, { nombre: string; puntos: number; color: string }> = {}
  rows.forEach((r: any) => {
    const id = r.jugador_id
    if (!porJugador[id] || r.puntos > porJugador[id].puntos) {
      porJugador[id] = { nombre: r.jugadores?.nombre ?? "?", puntos: r.puntos, color: r.jugadores?.color ?? "#7c3aed" }
    }
  })
  const topJugadores = Object.values(porJugador).sort((a, b) => b.puntos - a.puntos).slice(0, 5)

  const conteoJuegos: Record<string, number> = {}
  rows.forEach((r: any) => { conteoJuegos[r.juego] = (conteoJuegos[r.juego] ?? 0) + 1 })
  const totalPartidas = rows.length || 1
  const juegosMasJugados = Object.entries(conteoJuegos).map(([nombre, count]) => ({
    nombre: nombre === "shake" ? "Shake Battle" : "Dodge Game",
    porcentaje: Math.round((count / totalPartidas) * 100),
    color: nombre === "shake" ? "#a4ff00" : "#c41e5a",
  })).sort((a, b) => b.porcentaje - a.porcentaje)

  const oro    = cups.filter((c: any) => c.nivel === "Oro").length
  const plata  = cups.filter((c: any) => c.nivel === "Plata").length
  const bronce = cups.filter((c: any) => c.nivel === "Bronce").length
  const canjeados = cups.filter((c: any) => c.canjeado).length
  const expirados = cups.filter((c: any) => !c.canjeado && new Date(c.expires_at) < now).length
  const pendientes = cups.length - canjeados - expirados
  const tasaCanje = cups.length > 0 ? Math.round((canjeados / cups.length) * 100) : 0

  return {
    success: true,
    data: {
      jugadores: jugadoresUnicos.size,
      partidas: rows.length,
      puntajeMax,
      topJugadores,
      juegosMasJugados,
      cuponesGen: { valor: cups.length, porcentajeCanje: tasaCanje },
      cuponesPorNivel: { oro, plata, bronce, tasaCanje },
      cuponesList: { total: cups.length, canjeados, pendientes, expirados },
    }
  }
}

export default { getTop3, saveScore, getStatsDia }
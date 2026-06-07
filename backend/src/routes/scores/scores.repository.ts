import { SupabaseClient } from "../../clients/SupabaseClient"
import { ScorePayload, ApiResponse } from "../../types/types"


const getTop3 = async (salaId: string): Promise<ApiResponse<any[]>> => {
  const { data, error } = await SupabaseClient
    .from("partidas")
    .select("jugador_id, puntos, juego, jugadores(nombre, color)")
    .eq("sala_id", salaId)
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

export default { getTop3, saveScore }
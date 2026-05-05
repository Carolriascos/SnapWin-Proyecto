import { SupabaseClient } from "../../clients/SupabaseClient"
import { RegisterPayload, ApiResponse } from "../../types/types"


const createJugador = async (payload: RegisterPayload): Promise<ApiResponse<{ jugadorId: string; color: string }>> => {
  // Colores disponibles para el tablero del Shake Battle
  const COLORES = ["#7c3aed", "#16a34a", "#ea580c", "#db2777"]

  // Contar cuántos jugadores hay en la sala para asignar el color
  const { count } = await SupabaseClient
    .from("jugadores")
    .select("*", { count: "exact", head: true })
    .eq("sala_id", payload.salaId)

  const color = COLORES[(count ?? 0) % COLORES.length]

  const { data, error } = await SupabaseClient
    .from("jugadores")
    .insert({
      nombre:   payload.nombre,
      edad:     payload.edad,
      genero:   payload.genero,
      correo:   payload.correo,
      sala_id:  payload.salaId,
      color:    color,
    })
    .select()
    .single()

  if (error) {
    console.error("Error al crear jugador:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: { jugadorId: data.id, color } }
}

export default { createJugador }

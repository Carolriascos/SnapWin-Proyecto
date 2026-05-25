import { SupabaseClient } from "../../clients/SupabaseClient";
import { RegisterPayload, ApiResponse } from "../../types/types";

const createJugador = async (payload: RegisterPayload): Promise<ApiResponse<{ jugadorId: string; color: string }>> => {
  const COLORES = ["#7c3aed", "#16a34a", "#ea580c", "#db2777"];

  const { count } = await SupabaseClient.from("jugadores")
    .select("*", { count: "exact", head: true })
    .eq("sala_id", payload.salaId);

  const color = COLORES[(count ?? 0) % COLORES.length];

  const { data, error } = await SupabaseClient.from("jugadores")
    .insert({
      nombre: payload.nombre,
      edad: payload.edad,
      genero: payload.genero,
      correo: payload.correo,
      sala_id: payload.salaId,
      color: color,
    })
    .select()
    .single();

  if (error) {
    console.log(error);
    return { success: false, error: "Error al crear jugador" };
  }

  return {
    success: true,
    data: { jugadorId: data.id, color },
  };
};

export default { createJugador };

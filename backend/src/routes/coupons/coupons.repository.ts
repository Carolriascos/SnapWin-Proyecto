import { SupabaseClient } from "../../clients/SupabaseClient";
import { ApiResponse, Coupon } from "../../types/types";

/* Descuentos según posición en el ranking */
const PRIZES: Record<number, { nivel: "Oro" | "Plata" | "Bronce"; descuento: number }> = {
  1: { nivel: "Oro", descuento: 20 },
  2: { nivel: "Plata", descuento: 15 },
  3: { nivel: "Bronce", descuento: 10 },
};

/*Genera un código único  8 caracteres. */
const generarCodigo = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const parte1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const parte2 = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `FP-${parte1}-${parte2}`;
};

/*Crea un nuevo cupón para un jugador según su posición. */
const generateCoupon = async (jugadorId: string, posicion: number): Promise<ApiResponse<Coupon>> => {
  const prize = PRIZES[posicion];
  if (!prize) {
    return { success: false, error: "Posición inválida para generar cupón" };
  }

  const expiresAt = new Date();
  expiresAt.setHours(23, 59, 59, 999);

  const coupon: Omit<Coupon, "id"> = {
    codigo: generarCodigo(),
    jugadorId,
    nivel: prize.nivel,
    descuento: prize.descuento,
    canjeado: false,
    expiresAt: expiresAt.toISOString(),
  };

  const { data, error } = await SupabaseClient.from("cupones")
    .insert({
      codigo: coupon.codigo,
      jugador_id: coupon.jugadorId,
      nivel: coupon.nivel,
      descuento: coupon.descuento,
      canjeado: false,
      expires_at: coupon.expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error("Error al generar cupón:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: { ...coupon, ...data } };
};

const validateCoupon = async (
  codigo: string,
): Promise<ApiResponse<{ valido: boolean; motivo?: string; coupon?: any }>> => {
  const { data, error } = await SupabaseClient.from("cupones").select("*").eq("codigo", codigo).single();

  if (error || !data) {
    return { success: true, data: { valido: false, motivo: "Código no encontrado" } };
  }

  if (data.canjeado) {
    return { success: true, data: { valido: false, motivo: "El cupón ya fue canjeado" } };
  }

  if (new Date(data.expires_at) < new Date()) {
    return { success: true, data: { valido: false, motivo: "El cupón ha vencido" } };
  }

  return { success: true, data: { valido: true, coupon: data } };
};

/** Marca el cupón como canjeado. */
const redeemCoupon = async (codigo: string): Promise<ApiResponse<any>> => {
  const { data, error } = await SupabaseClient.from("cupones")
    .update({ canjeado: true, canjeado_at: new Date().toISOString() })
    .eq("codigo", codigo)
    .select()
    .single();

  if (error) {
    console.error("Error al canjear cupón:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
};

export default { generateCoupon, validateCoupon, redeemCoupon };

import { SupabaseClient } from "../../clients/SupabaseClient";
import { ApiResponse, Coupon } from "../../types/types";


const PRIZES: Record<number, { nivel: "Oro" | "Plata" | "Bronce"; descuento: number }> = {
  1: { nivel: "Oro", descuento: 20 },
  2: { nivel: "Plata", descuento: 15 },
  3: { nivel: "Bronce", descuento: 10 },
};


const generarCodigo = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const parte1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const parte2 = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `FP-${parte1}-${parte2}`;
};


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

const listCoupons = async (): Promise<ApiResponse<any[]>> => {
  const { data, error } = await SupabaseClient
    .from("cupones")
    .select("codigo, nivel, descuento, canjeado, canjeado_at, expires_at, jugador_id, jugadores(nombre)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al listar cupones:", error);
    return { success: false, error: error.message };
  }

  const now = new Date();
  const cupones = (data ?? []).map((c: any) => {
    let estado: "Canjeado" | "Pendiente" | "Expirado";
    if (c.canjeado) {
      estado = "Canjeado";
    } else if (new Date(c.expires_at) < now) {
      estado = "Expirado";
    } else {
      estado = "Pendiente";
    }

    const hora = c.canjeado_at
      ? new Date(c.canjeado_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
      : new Date(c.expires_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

    return {
      codigo: c.codigo,
      jugador: c.jugadores?.nombre ?? "Desconocido",
      hora,
      nivel: c.nivel,
      juego: "-",  
      estado,
    };
  });

  return { success: true, data: cupones };
};

export default { generateCoupon, validateCoupon, redeemCoupon, listCoupons };

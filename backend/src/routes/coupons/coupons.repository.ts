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

const BOGOTA_TZ = "America/Bogota";

const formatFecha = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: BOGOTA_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const calcularEstado = (canjeado: boolean, expiresAt: string): "Canjeado" | "Pendiente" | "Expirado" => {
  if (canjeado) return "Canjeado";
  if (new Date(expiresAt) < new Date()) return "Expirado";
  return "Pendiente";
};

const mapJuegoNombre = (juego: string | undefined): string => {
  if (!juego) return "-";
  if (juego === "shake") return "Shake Battle";
  if (juego === "dodge") return "Dodge Game";
  return juego;
};

const getLatestCouponForPlayer = async (jugadorId: string): Promise<ApiResponse<Coupon | null>> => {
  const { data, error } = await SupabaseClient
    .from("cupones")
    .select("*")
    .eq("jugador_id", jugadorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error al buscar cupón del jugador:", error);
    return { success: false, error: error.message };
  }

  if (!data) return { success: true, data: null };

  return {
    success: true,
    data: {
      codigo: data.codigo,
      jugadorId: data.jugador_id,
      nivel: data.nivel,
      descuento: data.descuento,
      canjeado: data.canjeado,
      expiresAt: data.expires_at,
    },
  };
};

const generateCoupon = async (jugadorId: string, posicion: number): Promise<ApiResponse<Coupon>> => {
  const prize = PRIZES[posicion];
  if (!prize) {
    return { success: false, error: "Posición inválida para generar cupón" };
  }

  const existente = await getLatestCouponForPlayer(jugadorId);
  if (existente.success && existente.data) {
    return { success: true, data: existente.data };
  }

  const now = new Date();
  const expiresParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = expiresParts.find((p) => p.type === "year")?.value ?? "2026";
  const m = expiresParts.find((p) => p.type === "month")?.value ?? "01";
  const d = expiresParts.find((p) => p.type === "day")?.value ?? "01";
  const expiresAt = new Date(`${y}-${m}-${d}T23:59:59.999-05:00`);

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
      created_at: now.toISOString(),
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
): Promise<ApiResponse<{ valido: boolean; estado: string; mensaje: string; motivo?: string; coupon?: any }>> => {
  const { data, error } = await SupabaseClient
    .from("cupones")
    .select("*, jugadores(nombre)")
    .eq("codigo", codigo)
    .single();

  if (error || !data) {
    return {
      success: true,
      data: {
        valido: false,
        estado: "no_encontrado",
        mensaje: "❌ Cupón no encontrado.",
        motivo: "Código no encontrado",
      },
    };
  }

  const jugador = (data as any).jugadores?.nombre ?? "Sin asignar";
  const estadoActual = calcularEstado(data.canjeado, data.expires_at);
  const detalle = {
    codigo: data.codigo,
    created_at: data.created_at,
    expires_at: data.expires_at,
    estadoActual,
    jugador,
    nivel: data.nivel,
    descuento: data.descuento,
    canjeado_at: data.canjeado_at ?? null,
  };

  if (data.canjeado) {
    return {
      success: true,
      data: {
        valido: false,
        estado: "canjeado",
        mensaje: "⚠️ Este cupón ya fue canjeado.",
        motivo: "El cupón ya fue canjeado",
        coupon: { ...data, ...detalle },
      },
    };
  }

  if (new Date(data.expires_at) < new Date()) {
    return {
      success: true,
      data: {
        valido: false,
        estado: "expirado",
        mensaje: "⚠️ Este cupón ha expirado y no puede ser utilizado.",
        motivo: "El cupón ha vencido",
        coupon: { ...data, ...detalle },
      },
    };
  }

  return {
    success: true,
    data: {
      valido: true,
      estado: "valido",
      mensaje: "✅ Cupón válido. Puede ser canjeado.",
      coupon: { ...data, ...detalle },
    },
  };
};

const redeemCoupon = async (codigo: string): Promise<ApiResponse<any>> => {
  const validacion = await validateCoupon(codigo);
  if (!validacion.success || !validacion.data?.valido) {
    return { success: false, error: validacion.data?.motivo ?? "Cupón no válido" };
  }

  const now = new Date().toISOString();
  let { data, error } = await SupabaseClient.from("cupones")
    .update({ canjeado: true, canjeado_at: now })
    .eq("codigo", codigo)
    .select("*, jugadores(nombre)")
    .single();

  if (error?.message?.includes("canjeado_at")) {
    const fallback = await SupabaseClient.from("cupones")
      .update({ canjeado: true })
      .eq("codigo", codigo)
      .select("*, jugadores(nombre)")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("Error al canjear cupón:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
};

const redeemCouponPlayer = async (codigo: string, jugadorId: string): Promise<ApiResponse<any>> => {
  const validacion = await validateCoupon(codigo);
  if (!validacion.success || !validacion.data?.valido) {
    return { success: false, error: validacion.data?.motivo ?? "Cupón no válido" };
  }

  const coupon = validacion.data.coupon;
  if (coupon.jugador_id && coupon.jugador_id !== jugadorId) {
    return { success: false, error: "Este cupón no pertenece a tu cuenta" };
  }

  const now = new Date().toISOString();
  let { data, error } = await SupabaseClient.from("cupones")
    .update({ canjeado: true, canjeado_at: now })
    .eq("codigo", codigo)
    .select()
    .single();

  if (error?.message?.includes("canjeado_at")) {
    const fallback = await SupabaseClient.from("cupones")
      .update({ canjeado: true })
      .eq("codigo", codigo)
      .select()
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("Error al canjear cupón (jugador):", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
};

const listCoupons = async (): Promise<ApiResponse<{ cupones: any[]; stats: { totalGenerados: number; canjeados: number; pendientes: number; expirados: number } }>> => {
  const selectConCanje = "codigo, nivel, descuento, canjeado, canjeado_at, expires_at, created_at, jugador_id, jugadores(nombre)";
  const selectSinCanje = "codigo, nivel, descuento, canjeado, expires_at, created_at, jugador_id, jugadores(nombre)";

  let data: any[] | null = null;
  let error: { message: string } | null = null;

  const primary = await SupabaseClient
    .from("cupones")
    .select(selectConCanje)
    .order("created_at", { ascending: false });
  data = primary.data;
  error = primary.error;

  if (error?.message?.includes("canjeado_at")) {
    const fallback = await SupabaseClient
      .from("cupones")
      .select(selectSinCanje)
      .order("created_at", { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("Error al listar cupones:", error);
    return { success: false, error: error.message };
  }

  const jugadorIds = [...new Set((data ?? []).map((c: any) => c.jugador_id).filter(Boolean))];
  const juegosPorJugador: Record<string, string> = {};

  if (jugadorIds.length > 0) {
    const { data: partidas } = await SupabaseClient
      .from("partidas")
      .select("jugador_id, juego, created_at")
      .in("jugador_id", jugadorIds)
      .order("created_at", { ascending: false });

    (partidas ?? []).forEach((p: any) => {
      if (!juegosPorJugador[p.jugador_id]) {
        juegosPorJugador[p.jugador_id] = mapJuegoNombre(p.juego);
      }
    });
  }

  const now = new Date();
  const cupones = (data ?? []).map((c: any) => {
    const estado = calcularEstado(c.canjeado, c.expires_at);

    return {
      codigo: c.codigo,
      jugador: c.jugadores?.nombre ?? "Desconocido",
      hora: formatFecha(c.created_at),
      nivel: c.nivel,
      juego: juegosPorJugador[c.jugador_id] ?? "-",
      estado,
      created_at: c.created_at,
      expires_at: c.expires_at,
      canjeado_at: c.canjeado_at,
    };
  });

  const stats = {
    totalGenerados: cupones.length,
    canjeados: cupones.filter((c) => c.estado === "Canjeado").length,
    pendientes: cupones.filter((c) => c.estado === "Pendiente").length,
    expirados: cupones.filter((c) => c.estado === "Expirado").length,
  };

  return { success: true, data: { cupones, stats } };
};

export default {
  generateCoupon,
  validateCoupon,
  redeemCoupon,
  redeemCouponPlayer,
  listCoupons,
  getLatestCouponForPlayer,
};

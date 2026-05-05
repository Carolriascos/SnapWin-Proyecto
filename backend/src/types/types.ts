/** Datos que llegan del formulario de registro del celular */
export type RegisterPayload = {
  nombre: string;
  edad: number;
  genero: "Hombre" | "Mujer" | "Otro";
  correo: string;
  salaId: string;
};

export type Credentials = {
  email: string;
  password: string;
};

export type ScorePayload = {
  jugadorId: string;
  juego: "shake" | "dodge";
  salaId: string;
  puntos: number;
};

/** Cupón generado al terminar el juego */
export type Coupon = {
  codigo: string;
  jugadorId: string;
  nivel: "Oro" | "Plata" | "Bronce";
  descuento: number;
  canjeado: boolean;
  expiresAt: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface RegisterPayload {
  nombre: string
  edad:   number
  genero: 'Hombre' | 'Mujer' | 'Otro'
  correo: string
  salaId: string
}

export interface Jugador {
  id:     string
  nombre: string
  color:  string
}

export interface ScoreEntry {
  jugador_id: string
  puntos:     number
  jugadores?: { nombre: string; color: string }
}

export interface Coupon {
  codigo:    string
  nivel:     'Oro' | 'Plata' | 'Bronce'
  descuento: number
  canjeado:  boolean
  expires_at: string
}

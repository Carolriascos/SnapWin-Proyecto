
-- Tabla de jugadores
CREATE TABLE IF NOT EXISTS jugadores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  edad       INTEGER,
  genero     TEXT,
  correo     TEXT,
  sala_id    TEXT DEFAULT 'sala-001',
  color      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de partidas
CREATE TABLE IF NOT EXISTS partidas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id UUID REFERENCES jugadores(id),
  juego      TEXT NOT NULL,
  sala_id    TEXT DEFAULT 'sala-001',
  puntos     INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de cupones
CREATE TABLE IF NOT EXISTS cupones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo     TEXT UNIQUE NOT NULL,
  jugador_id UUID REFERENCES jugadores(id),
  nivel      TEXT NOT NULL,
  descuento  INTEGER NOT NULL,
  canjeado   BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de administradores
CREATE TABLE IF NOT EXISTS administradores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  usuario    TEXT UNIQUE NOT NULL,
  correo     TEXT NOT NULL,
  password   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jugadores DISABLE ROW LEVEL SECURITY;
ALTER TABLE partidas DISABLE ROW LEVEL SECURITY;
ALTER TABLE cupones DISABLE ROW LEVEL SECURITY;
ALTER TABLE administradores DISABLE ROW LEVEL SECURITY;

INSERT INTO administradores (nombre, usuario, correo, password)
VALUES ('Admin Snap Win', 'admin', 'admin@snapwin.com', 'snapwin123')
ON CONFLICT (usuario) DO NOTHING;
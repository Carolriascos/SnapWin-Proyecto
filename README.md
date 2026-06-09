# SnapWin — Guía para correr la aplicación en local

SnapWin es una plataforma de juegos en vivo para centros comerciales. Incluye:

- **Celular del jugador:** registro, Shake Battle y Dodge Game.
- **Pantalla del mall:** QR, juego en vivo y resultados.
- **Panel admin:** validación de cupones y estadísticas.

El proyecto tiene dos partes:

| Carpeta     | Tecnología              | Puerto por defecto |
|-------------|-------------------------|--------------------|
| `backend/`  | Node.js, Express, Socket.IO, Supabase | `3000` |
| `frontend/` | React, TypeScript, Vite | `5173` |

---

## Requisitos previos

- [Node.js](https://nodejs.org/) **18 o superior** (recomendado LTS).
- [npm](https://www.npmjs.com/) (viene con Node.js).
- Cuenta en [Supabase](https://supabase.com/) con el proyecto configurado.
- *(Opcional)* Cuenta en [Brevo](https://www.brevo.com/) si quieres probar el envío de cupones por correo.

---

## 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd SnapWin-Proyecto
```

---

## 2. Configurar el backend

### Instalar dependencias

```bash
cd backend
npm install
```

### Variables de entorno

Crea un archivo `backend/.env` con el siguiente contenido:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_clave_anon_de_supabase

# Opcional — envío de cupones por correo
BREVO_API_KEY=tu_api_key_de_brevo
BREVO_SENDER_EMAIL=correo_verificado@tudominio.com
BREVO_SENDER_NAME=SnapWin

# Opcional — panel de administración
ADMIN_SECRET=snapwin-admin-secret

PORT=3000
```

Obtén `SUPABASE_URL` y `SUPABASE_ANON_KEY` en Supabase → **Project Settings** → **API**.

### Iniciar el servidor

```bash
npm run dev
```

Si todo está bien, verás:

```text
backend corriendo en http://localhost:3000
```

Comprueba el estado del API:

```text
http://localhost:3000/api/health
```

Debe responder: `{"status":"ok"}`.

---

## 3. Configurar el frontend

Abre **otra terminal** (deja el backend corriendo).

### Instalar dependencias

```bash
cd frontend
npm install
```

### Variables de entorno (opcional en local)

En desarrollo local crear un `.env` en el frontend. Vite redirige las peticiones al backend mediante proxy hacia `http://localhost:3000`.

Para personalizar el puerto o la URL del QR para probar en el celular, crea `frontend/.env`:

```env
# Puerto del servidor de desarrollo (por defecto 5173)
VITE_DEV_PORT=5173


```

> **Nota:** `VITE_BACKEND_URL` solo es necesaria en producción (Vercel).

### Iniciar el frontend

```bash
npm run dev
```

Abre en el navegador:

```text
http://localhost:5173
```

---

## 4. Rutas principales

### Jugador (celular o navegador)

| Ruta            | Descripción                          |
|-----------------|--------------------------------------|
| `/`             | Elegir juego (Shake Battle / Dodge)  |
| `/register`     | Registro del jugador                 |
| `/waiting`      | Sala de espera                       |
| `/shake`        | Shake Battle                         |
| `/dodge`        | Dodge Game                           |
| `/result`       | Resultados y cupón                   |

### Pantalla del mall

| Ruta              | Descripción              |
|-------------------|--------------------------|
| `/mall`           | QR y pantalla de atraque |
| `/mall/waiting`   | Sala de espera del mall  |
| `/mall/shake`     | Shake Battle en vivo     |
| `/mall/dodge`     | Dodge Game en vivo       |
| `/mall/results`   | Resultados finales       |

### Administración

| Ruta                 | Descripción        |
|----------------------|--------------------|
| `/admin`             | Inicio de sesión   |
| `/admin/dashboard`   | Panel principal    |
| `/admin/validate`    | Validar cupones    |

---


---

## 5. Flujo de prueba recomendado

1. **Terminal 1:** `cd backend && npm run dev`
2. **Terminal 2:** `cd frontend && npm run dev`
3. En el **PC**, abre `http://localhost:5173/mall` (pantalla del mall).
4. En **dos celulares** (o pestañas móviles), abre `http://TU_IP:5173`, regístrate y elige un juego.
5. Cuando haya al menos 2 jugadores, la partida inicia con cuenta regresiva.
6. Juega Shake o Dodge; el mall muestra el progreso en vivo.


---

## 6. Despliegue en producción

Para publicar en **Render** (backend) y **Vercel** (frontend), consulta el archivo [DEPLOY.md](./DEPLOY.md).

---

## Estructura del proyecto

```text
SnapWin-Proyecto/
├── backend/          # API REST + WebSockets (Socket.IO)
│   └── src/
├── frontend/         # Aplicación React
│   └── src/
│       ├── pages/
│       │   ├── client/   # Experiencia del jugador
│       │   ├── mall/     # Pantallas del centro comercial
│       │   └── admin/    # Panel administrativo
│       └── utils/
├── DEPLOY.md         # Guía de despliegue
└── README.md         # Este archivo
```

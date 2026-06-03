# Despliegue: Render (backend) + Vercel (frontend)

## URLs de entrega

| Servicio | Plataforma | Variable clave |
|----------|------------|----------------|
| Backend  | Render     | `https://TU-SERVICIO.onrender.com` |
| Frontend | Vercel     | `https://TU-PROYECTO.vercel.app` ← **URL para el README / profesor** |

---

## PASO 1 — Backend en Render (~15 min)

1. [render.com](https://render.com) → **Sign up with GitHub**
2. **New** → **Web Service** → conecta el repositorio de GitHub
3. Configuración:

   | Campo | Valor |
   |-------|--------|
   | **Root Directory** | `SnapWin-Proyecto/backend` |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm start` |

4. **Environment Variables** (Settings → Environment):

   | Variable | Valor |
   |----------|--------|
   | `SUPABASE_URL` | `https://htcrblffobywcprjxiyi.supabase.co` |
   | `SUPABASE_ANON_KEY` | Tu clave anon real (Supabase → Project Settings → API) |
   | `NODE_ENV` | `production` |

   > **No hace falta** definir `PORT` manualmente: Render inyecta `PORT` y el backend ya usa `process.env.PORT`.

5. **Create Web Service** y espera el primer deploy.
6. Copia la URL pública, por ejemplo: `https://snap-win.onrender.com`
7. Prueba: abre `https://TU-URL.onrender.com/api/health` → debe responder `{"status":"ok"}`.

---

## PASO 2 — Frontend en Vercel (~10 min)

1. [vercel.com](https://vercel.com) → **Sign up with GitHub**
2. **Add New** → **Project** → importa el mismo repo
3. Configuración:

   | Campo | Valor |
   |-------|--------|
   | **Root Directory** | `SnapWin-Proyecto/frontend` |
   | **Framework Preset** | Vite |

4. **Environment Variables**:

   | Variable | Valor |
   |----------|--------|
   | `VITE_BACKEND_URL` | URL de Render **sin** barra final, ej. `https://snap-win.onrender.com` |

   Opcional (cupones por email):

   | Variable | Descripción |
   |----------|-------------|
   | `VITE_EMAILJS_SERVICE_ID` | EmailJS |
   | `VITE_EMAILJS_TEMPLATE_ID` | EmailJS |
   | `VITE_EMAILJS_PUBLIC_KEY` | EmailJS |
   | `VITE_FRONTEND_URL` | URL de Vercel (QR / pantalla mall) |

5. **Deploy**
6. URL pública: `https://tu-proyecto.vercel.app` → esta va en el README.

---

## PASO 3 — Desarrollo local vs producción

- **Local:** `vite.config.ts` hace proxy de `/auth`, `/scores`, etc. hacia `http://localhost:3000`. No necesitas `VITE_BACKEND_URL` en `.env` para desarrollo.
- **Producción:** el proxy no existe. El frontend usa `VITE_BACKEND_URL` vía `src/config/api.ts` y WebSockets en `getSocketUrl()`.

---

## Orden recomendado

1. Render primero (obtienes la URL del API).
2. Vercel después (pegas esa URL en `VITE_BACKEND_URL`).
3. Si cambias la URL de Render, redeploy en Vercel para que Vite vuelva a embeber la variable en el build.

---

## Local (referencia)

```bash
# Terminal 1 — backend
cd SnapWin-Proyecto/backend
npm install
npm run dev

# Terminal 2 — frontend
cd SnapWin-Proyecto/frontend
npm install
npm run dev
```

Frontend: http://localhost:5173 — Backend: http://localhost:3000

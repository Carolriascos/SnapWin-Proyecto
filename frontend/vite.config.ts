import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'os'

function getLanIPv4(): string | null {
  const nets = os.networkInterfaces()
  for (const iface of Object.values(nets)) {
    if (!iface) continue
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return null
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.VITE_DEV_PORT) || 5173
  const lanIp = getLanIPv4()
  const devLanUrl = lanIp ? `http://${lanIp}:${port}` : ''

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_DEV_LAN_URL': JSON.stringify(devLanUrl),
    },
    server: {
      allowedHosts: true,
      port,
      host: true,
      proxy: {
        '/auth': { target: 'http://localhost:3000', changeOrigin: true },
        '/scores': { target: 'http://localhost:3000', changeOrigin: true },
        '/coupons': { target: 'http://localhost:3000', changeOrigin: true },
        '/email': { target: 'http://localhost:3000', changeOrigin: true },
        '/api': { target: 'http://localhost:3000', changeOrigin: true },
        '/api/admin': { target: 'http://localhost:3000', changeOrigin: true },
        '/real-time': { target: 'http://localhost:3000', changeOrigin: true, ws: true },
      },
    },
  }
})

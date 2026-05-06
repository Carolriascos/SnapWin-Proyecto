import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['hefty-army-celibacy.ngrok-free.dev'],
    port: 5173,
    host: true, // <- esta línea expone en red local
    proxy: {
      '/auth':      { target: 'http://localhost:3000', changeOrigin: true },
      '/scores':    { target: 'http://localhost:3000', changeOrigin: true },
      '/coupons':   { target: 'http://localhost:3000', changeOrigin: true },
      '/api':       { target: 'http://localhost:3000', changeOrigin: true },
      '/api/admin': { target: 'http://localhost:3000', changeOrigin: true },
      '/real-time': { target: 'http://localhost:3000', changeOrigin: true, ws: true },
    }
  }
})
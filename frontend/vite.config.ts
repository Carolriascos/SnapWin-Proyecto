import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['hefty-army-celibacy.ngrok-free.dev'],
    port: 5173,
    proxy: {
      '/auth':    'http://localhost:3000',
      '/scores':  'http://localhost:3000',
      '/coupons': 'http://localhost:3000',
      '/api':     'http://localhost:3000',
    }
  }
})

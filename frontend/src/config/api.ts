
export const API_BASE = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/$/, '')

export function getSocketUrl(): string {
  const explicit = import.meta.env.VITE_BACKEND_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')

  const { hostname, protocol } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000'
  }
  return ''
}


export function getPlayerAppUrl(): string {
  const fromEnv = import.meta.env.VITE_FRONTEND_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  const lanFromVite = import.meta.env.VITE_DEV_LAN_URL?.trim()
  if (lanFromVite) return lanFromVite.replace(/\/$/, '')

  const { hostname, protocol, port } = window.location
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return window.location.origin
  }

  return `${protocol}//${hostname}${port ? `:${port}` : ''}`
}

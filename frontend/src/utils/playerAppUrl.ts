export function getPlayerAppUrl(): string {
  const fromEnv = import.meta.env.VITE_FRONTEND_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  if (typeof window !== 'undefined') {
    const { hostname, protocol, port, origin } = window.location
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
    const isPrivateLan =
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)

    if (!isLocal && !isPrivateLan) {
      return origin.replace(/\/$/, '')
    }
  }

  const lanFromVite = import.meta.env.VITE_DEV_LAN_URL?.trim()
  if (lanFromVite) return lanFromVite.replace(/\/$/, '')

  if (typeof window !== 'undefined') {
    const { hostname, protocol, port } = window.location
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`
  }

  return ''
}

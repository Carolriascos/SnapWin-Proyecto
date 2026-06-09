/**
 * Sistema de inclinación para Dodge — multiplataforma (Android / iOS).
 * Feature detection, permisos bajo gesto del usuario, calibración, suavizado e histéresis.
 */

export type TiltDirection = -1 | 1

export type SensorStatus =
  | 'idle'
  | 'pending_permission'
  | 'active'
  | 'unavailable'
  | 'denied'
  | 'no_data'

export interface SensorCapabilities {
  secureContext: boolean
  hasDeviceOrientation: boolean
  hasDeviceMotion: boolean
  needsOrientationPermission: boolean
  needsMotionPermission: boolean
  requiresUserGesture: boolean
}

export interface TiltSensorCallbacks {
  onTilt: (dir: TiltDirection) => void
  onStatus: (status: SensorStatus) => void
}

export interface TiltSensorHandle {
  start: () => Promise<boolean>
  stop: () => void
  getStatus: () => SensorStatus
}

// ── Calibración y sensibilidad ──────────────────────────────────────────────
const DEAD_ZONE_DEG       = 10   // zona muerta alrededor del neutro
const LANE_THRESHOLD_DEG  = 26   // inclinación mínima para cambiar carril
const COOLDOWN_MS         = 580  // tiempo mínimo entre cambios de carril
const SMOOTHING_ALPHA     = 0.14 // filtro paso-bajo (menor = más suave)
const CALIBRATION_COUNT   = 18   // muestras para calcular neutro
const NO_DATA_TIMEOUT_MS  = 3200

type PermissionCtor = { requestPermission?: () => Promise<PermissionState | string> }

export function getSensorCapabilities(): SensorCapabilities {
  const hasDeviceOrientation = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
  const hasDeviceMotion = typeof window !== 'undefined' && 'DeviceMotionEvent' in window
  const needsOrientationPermission =
    hasDeviceOrientation &&
    typeof (DeviceOrientationEvent as unknown as PermissionCtor).requestPermission === 'function'
  const needsMotionPermission =
    hasDeviceMotion &&
    typeof (DeviceMotionEvent as unknown as PermissionCtor).requestPermission === 'function'

  return {
    secureContext: typeof window !== 'undefined' && window.isSecureContext,
    hasDeviceOrientation,
    hasDeviceMotion,
    needsOrientationPermission,
    needsMotionPermission,
    requiresUserGesture: needsOrientationPermission || needsMotionPermission,
  }
}

/** @deprecated Usar getSensorCapabilities().requiresUserGesture */
export function needsSensorPermission(): boolean {
  return getSensorCapabilities().requiresUserGesture
}

export function getSensorStatusMessage(status: SensorStatus): string | null {
  switch (status) {
    case 'pending_permission':
      return 'Toca el botón para activar el control por inclinación.'
    case 'denied':
      return 'No pudimos acceder al sensor. Usa los botones ◀ ▶ o desliza el dedo.'
    case 'unavailable':
      return 'Tu navegador no admite control por inclinación. Usa los botones ◀ ▶ o desliza.'
    case 'no_data':
      return 'No detectamos movimiento. Usa los botones ◀ ▶ o desliza el dedo.'
    case 'active':
      return null
    default:
      return null
  }
}

function tiltFromGravity(ax: number, ay: number, az: number): number {
  const denom = Math.sqrt(ay * ay + az * az) || 1
  return (Math.atan2(ax, denom) * 180) / Math.PI
}

function normalizeOrientationTilt(e: DeviceOrientationEvent): number | null {
  if (e.gamma != null && Number.isFinite(e.gamma)) return e.gamma
  return null
}

function normalizeMotionTilt(e: DeviceMotionEvent): number | null {
  const g = e.accelerationIncludingGravity
  if (!g || g.x == null || g.y == null || g.z == null) return null
  return tiltFromGravity(g.x, g.y, g.z)
}

async function requestSensorPermission(
  ctor: PermissionCtor | undefined,
): Promise<'granted' | 'denied' | 'skipped'> {
  if (!ctor?.requestPermission) return 'skipped'
  try {
    const result = await ctor.requestPermission()
    return result === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

export function createTiltSensor(callbacks: TiltSensorCallbacks): TiltSensorHandle {
  const caps = getSensorCapabilities()

  let status: SensorStatus = 'idle'
  let orientHandler: ((e: DeviceOrientationEvent) => void) | null = null
  let motionHandler: ((e: DeviceMotionEvent) => void) | null = null
  let noDataTimer: ReturnType<typeof setTimeout> | null = null
  let receivingData = false
  let lastOrientAt = 0

  // Calibración y suavizado
  let calibrationBuf: number[] = []
  let neutralTilt = 0
  let calibrated = false
  let smoothedTilt = 0
  let hasSmoothed = false

  // Histéresis y control de carril
  let armed = true
  let lastChangeTime = 0

  const setStatus = (next: SensorStatus) => {
    if (status === next) return
    status = next
    callbacks.onStatus(next)
  }

  const clearNoDataTimer = () => {
    if (noDataTimer) { clearTimeout(noDataTimer); noDataTimer = null }
  }

  const scheduleNoDataCheck = () => {
    clearNoDataTimer()
    noDataTimer = setTimeout(() => {
      if (!receivingData && status !== 'denied') setStatus('no_data')
    }, NO_DATA_TIMEOUT_MS)
  }

  const markActive = () => {
    if (!receivingData) {
      receivingData = true
      clearNoDataTimer()
      setStatus('active')
    }
  }

  const processTiltSample = (raw: number) => {
    if (!Number.isFinite(raw)) return
    markActive()

    if (!calibrated) {
      calibrationBuf.push(raw)
      if (calibrationBuf.length >= CALIBRATION_COUNT) {
        neutralTilt = calibrationBuf.reduce((a, b) => a + b, 0) / calibrationBuf.length
        smoothedTilt = neutralTilt
        calibrated = true
        hasSmoothed = true
        calibrationBuf = []
      }
      return
    }

    smoothedTilt = hasSmoothed
      ? smoothedTilt + SMOOTHING_ALPHA * (raw - smoothedTilt)
      : raw
    hasSmoothed = true

    const relative = smoothedTilt - neutralTilt
    const now = Date.now()

    if (!armed) {
      if (Math.abs(relative) < DEAD_ZONE_DEG) armed = true
      return
    }

    if (now - lastChangeTime < COOLDOWN_MS) return

    if (relative < -LANE_THRESHOLD_DEG) {
      callbacks.onTilt(-1)
      lastChangeTime = now
      armed = false
    } else if (relative > LANE_THRESHOLD_DEG) {
      callbacks.onTilt(1)
      lastChangeTime = now
      armed = false
    }
  }

  const attachListeners = (useOrientation: boolean, useMotion: boolean) => {
    lastOrientAt = 0

    if (useOrientation) {
      orientHandler = (e: DeviceOrientationEvent) => {
        const tilt = normalizeOrientationTilt(e)
        if (tilt == null) return
        lastOrientAt = Date.now()
        processTiltSample(tilt)
      }
      window.addEventListener('deviceorientation', orientHandler)
    }

    if (useMotion) {
      motionHandler = (e: DeviceMotionEvent) => {
        // Usar motion solo como respaldo si orientation no envía datos (común en algunos Android)
        if (useOrientation && lastOrientAt > 0 && Date.now() - lastOrientAt < 500) return
        const tilt = normalizeMotionTilt(e)
        if (tilt != null) processTiltSample(tilt)
      }
      window.addEventListener('devicemotion', motionHandler)
    }
  }

  const detachListeners = () => {
    if (orientHandler) window.removeEventListener('deviceorientation', orientHandler)
    if (motionHandler) window.removeEventListener('devicemotion', motionHandler)
    orientHandler = null
    motionHandler = null
  }

  const resetState = () => {
    receivingData = false
    calibrationBuf = []
    neutralTilt = 0
    calibrated = false
    smoothedTilt = 0
    hasSmoothed = false
    armed = true
    lastChangeTime = 0
  }

  return {
    getStatus: () => status,

    async start() {
      detachListeners()
      clearNoDataTimer()
      resetState()

      if (!caps.secureContext) {
        setStatus('unavailable')
        return false
      }

      if (!caps.hasDeviceOrientation && !caps.hasDeviceMotion) {
        setStatus('unavailable')
        return false
      }

      let orientGranted = !caps.needsOrientationPermission
      let motionGranted = !caps.needsMotionPermission

      if (caps.needsOrientationPermission) {
        const result = await requestSensorPermission(
          DeviceOrientationEvent as unknown as PermissionCtor,
        )
        orientGranted = result === 'granted' || result === 'skipped'
        if (result === 'denied') {
          setStatus('denied')
          return false
        }
      }

      const useOrientation = caps.hasDeviceOrientation && orientGranted

      // Motion: respaldo en Android; en iOS solo si orientation no está disponible
      const useMotionForFallback = caps.hasDeviceMotion && (!useOrientation || !caps.requiresUserGesture)

      if (useMotionForFallback && caps.needsMotionPermission && !useOrientation) {
        const result = await requestSensorPermission(
          DeviceMotionEvent as unknown as PermissionCtor,
        )
        motionGranted = result === 'granted' || result === 'skipped'
        if (result === 'denied' && !useOrientation) {
          setStatus('denied')
          return false
        }
      }

      const useMotion = useMotionForFallback && motionGranted

      if (!useOrientation && !useMotion) {
        setStatus('unavailable')
        return false
      }

      attachListeners(useOrientation, useMotion)
      scheduleNoDataCheck()
      return true
    },

    stop() {
      detachListeners()
      clearNoDataTimer()
      resetState()
      status = 'idle'
    },
  }
}

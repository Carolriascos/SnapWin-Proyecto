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

export interface TiltSensorOptions {
  laneCount?: number
  initialLane?: number
}

export interface TiltSensorCallbacks {
  onLane: (lane: number) => void
  onStatus: (status: SensorStatus) => void
}

export interface TiltSensorHandle {
  start: () => Promise<boolean>
  stop: () => void
  getStatus: () => SensorStatus
}

const DEG_PER_LANE       = 7
const DEAD_ZONE_DEG      = 0.8
const SMOOTHING_ALPHA    = 0.62
const CALIBRATION_COUNT  = 6
const NO_DATA_TIMEOUT_MS = 3000

type PermissionCtor = { requestPermission?: () => Promise<PermissionState | string> }

export function getSensorCapabilities(): SensorCapabilities {
  const hasDeviceOrientation = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
  const hasDeviceMotion      = typeof window !== 'undefined' && 'DeviceMotionEvent' in window
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
    requiresUserGesture: true,
  }
}

export function needsSensorPermission(): boolean {
  const caps = getSensorCapabilities()
  return caps.needsOrientationPermission || caps.needsMotionPermission
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    navigator.maxTouchPoints > 0
  )
}

export function getSensorStatusMessage(status: SensorStatus): string | null {
  switch (status) {
    case 'pending_permission':
      return null
    case 'denied':
      return 'No pudimos acceder al sensor. Usa los botones ◀ ▶ o desliza el dedo.'
    case 'unavailable':
      return 'Tu navegador no admite control por inclinación. Usa los botones ◀ ▶ o desliza.'
    case 'no_data':
      return 'No detectamos movimiento. Intenta inclinar más el celular o usa ◀ ▶.'
    default:
      return null
  }
}

function screenAngle(): number {
  if (typeof window === 'undefined') return 0
  if (screen.orientation?.angle != null) {
    return ((screen.orientation.angle % 360) + 360) % 360
  }
  const o = window.orientation
  if (typeof o === 'number') return ((o % 360) + 360) % 360
  return 0
}

function isPortraitLayout(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(orientation: portrait)').matches
}

/**
 * Inclinación lateral normalizada a coordenadas de pantalla.
 * Positivo = inclinar a la DERECHA, negativo = inclinar a la IZQUIERDA.
 * Fórmula unificada W3C para portrait y landscape.
 */
function getOrientationTiltDegrees(e: DeviceOrientationEvent): number | null {
  if (e.beta == null || e.gamma == null) return null
  if (!Number.isFinite(e.beta) || !Number.isFinite(e.gamma)) return null

  const angle = screenAngle()
  const portrait = isPortraitLayout()

  let tilt: number
  if (portrait) {
    tilt = e.gamma
    if (angle === 180) tilt = -tilt
  } else if (angle === 90) {
    tilt = e.beta
  } else if (angle === 270) {
    tilt = -e.beta
  } else {
    tilt = e.beta
  }

  return tilt
}

/**
 * Misma convención que orientation, derivada del vector de gravedad.
 * Solo se usa si orientation no está disponible.
 */
function getMotionTiltDegrees(e: DeviceMotionEvent): number | null {
  const g = e.accelerationIncludingGravity
  if (!g || g.x == null || g.y == null || g.z == null) return null
  if (!Number.isFinite(g.x) || !Number.isFinite(g.y) || !Number.isFinite(g.z)) return null

  const angle = screenAngle()
  const portrait = isPortraitLayout()

  let gx: number
  let gy: number

  if (portrait) {
    gx = g.x
    gy = -g.y
    if (angle === 180) gx = -gx
  } else if (angle === 90) {
    gx = g.y
    gy = g.x
  } else if (angle === 270) {
    gx = -g.y
    gy = -g.x
  } else {
    gx = g.x
    gy = -g.y
  }

  return (Math.atan2(gx, Math.hypot(gy, g.z) || 1) * 180) / Math.PI
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

function clampLane(lane: number, laneCount: number): number {
  return Math.min(laneCount - 1, Math.max(0, lane))
}

export function createTiltSensor(
  callbacks: TiltSensorCallbacks,
  options: TiltSensorOptions = {},
): TiltSensorHandle {
  const caps = getSensorCapabilities()
  const laneCount = options.laneCount ?? 4
  const centerLane = (laneCount - 1) / 2
  const startLane = clampLane(options.initialLane ?? Math.round(centerLane), laneCount)

  let status: SensorStatus = 'idle'
  let orientHandler: ((e: DeviceOrientationEvent) => void) | null = null
  let motionHandler:  ((e: DeviceMotionEvent) => void) | null      = null
  let noDataTimer:    ReturnType<typeof setTimeout> | null          = null
  let receivingData  = false
  let useMotionOnly  = false

  let calibrationBuf: number[] = []
  let neutralTilt    = 0
  let calibrated     = false
  let smoothedTilt   = 0
  let lastLaneEmit   = startLane
  let tiltSign       = 1
  let signResolved   = false
  let lastMotionTilt: number | null = null
  let signCheckBuf: number[] = []

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

  const emitLane = (lane: number) => {
    const clamped = clampLane(lane, laneCount)
    if (clamped === lastLaneEmit) return
    lastLaneEmit = clamped
    callbacks.onLane(clamped)
  }

  const maybeResolveTiltSign = (orientTilt: number) => {
    if (signResolved || lastMotionTilt == null) return
    if (Math.abs(orientTilt) < 2 || Math.abs(lastMotionTilt) < 2) return

    signCheckBuf.push(Math.sign(orientTilt) === Math.sign(lastMotionTilt) ? 1 : -1)
    if (signCheckBuf.length < 5) return

    const inverted = signCheckBuf.filter(s => s < 0).length
    if (inverted >= 4) tiltSign = -1
    signResolved = true
    signCheckBuf = []
  }

  const processTiltSample = (raw: number, orientRaw?: number) => {
    if (!Number.isFinite(raw)) return
    markActive()

    if (!calibrated) {
      calibrationBuf.push(raw)
      if (calibrationBuf.length >= CALIBRATION_COUNT) {
        neutralTilt  = calibrationBuf.reduce((a, b) => a + b, 0) / calibrationBuf.length
        smoothedTilt = neutralTilt
        calibrated   = true
        calibrationBuf = []
        lastLaneEmit   = startLane
        emitLane(startLane)
      }
      return
    }

    if (!signResolved && orientRaw != null) {
      maybeResolveTiltSign(orientRaw)
    }

    smoothedTilt = smoothedTilt + SMOOTHING_ALPHA * (raw - smoothedTilt)
    const relative = tiltSign * (smoothedTilt - neutralTilt)

    if (Math.abs(relative) < DEAD_ZONE_DEG) return

    const lane = clampLane(Math.round(centerLane + relative / DEG_PER_LANE), laneCount)
    emitLane(lane)
  }

  const attachListeners = (useOrientation: boolean, useMotion: boolean) => {
    useMotionOnly = !useOrientation
    lastMotionTilt = null

    if (useOrientation) {
      orientHandler = (e: DeviceOrientationEvent) => {
        const tilt = getOrientationTiltDegrees(e)
        if (tilt == null) return
        processTiltSample(tilt, tilt)
      }
      window.addEventListener('deviceorientation', orientHandler, { passive: true })

      if (useMotion) {
        motionHandler = (e: DeviceMotionEvent) => {
          const motionTilt = getMotionTiltDegrees(e)
          if (motionTilt != null) lastMotionTilt = motionTilt
        }
        window.addEventListener('devicemotion', motionHandler, { passive: true })
      }
    } else if (useMotion) {
      signResolved = true
      motionHandler = (e: DeviceMotionEvent) => {
        const tilt = getMotionTiltDegrees(e)
        if (tilt == null) return
        processTiltSample(tilt)
      }
      window.addEventListener('devicemotion', motionHandler, { passive: true })
    }
  }

  const detachListeners = () => {
    if (orientHandler) window.removeEventListener('deviceorientation', orientHandler)
    if (motionHandler)  window.removeEventListener('devicemotion',     motionHandler)
    orientHandler = null
    motionHandler  = null
  }

  const resetState = () => {
    receivingData  = false
    useMotionOnly  = false
    calibrationBuf = []
    neutralTilt    = 0
    calibrated     = false
    smoothedTilt   = 0
    lastLaneEmit   = startLane
    tiltSign       = 1
    signResolved   = false
    lastMotionTilt = null
    signCheckBuf   = []
  }

  return {
    getStatus: () => status,

    async start() {
      detachListeners()
      clearNoDataTimer()
      resetState()

      if (!caps.secureContext) { setStatus('unavailable'); return false }
      if (!caps.hasDeviceOrientation && !caps.hasDeviceMotion) { setStatus('unavailable'); return false }

      setStatus('pending_permission')

      let allowOrientation = caps.hasDeviceOrientation
      let allowMotion = caps.hasDeviceMotion

      if (caps.needsOrientationPermission) {
        const result = await requestSensorPermission(
          DeviceOrientationEvent as unknown as PermissionCtor,
        )
        if (result === 'denied') allowOrientation = false
      }

      if (caps.needsMotionPermission) {
        const motionResult = await requestSensorPermission(
          DeviceMotionEvent as unknown as PermissionCtor,
        )
        if (motionResult === 'denied') allowMotion = false
      }

      if (!allowOrientation && !allowMotion) { setStatus('denied'); return false }

      attachListeners(allowOrientation, allowMotion)
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

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

const DEG_PER_LANE         = 11
const DEAD_ZONE_DEG        = 1.5
const SMOOTHING_ALPHA      = 0.18
const CALIBRATION_COUNT    = 12
const MIN_LANE_CHANGE_MS   = 140
const NO_DATA_TIMEOUT_MS   = 3000
const ORIENT_STALE_MS      = 600

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
 * Inclinación lateral en grados respecto a la pantalla.
 * Positivo = inclinar hacia la DERECHA, negativo = hacia la IZQUIERDA.
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
  } else {
    tilt = e.beta
    if (angle === 90 || angle === 270) tilt = -tilt
  }

  return tilt
}

function getMotionTiltDegrees(e: DeviceMotionEvent): number | null {
  const g = e.accelerationIncludingGravity
  if (!g || g.x == null || g.y == null || g.z == null) return null
  if (!Number.isFinite(g.x) || !Number.isFinite(g.y) || !Number.isFinite(g.z)) return null

  const angle = screenAngle()
  const portrait = isPortraitLayout()

  let lateral: number
  let vertical: number

  if (portrait) {
    lateral = g.x
    vertical = Math.hypot(g.y, g.z)
    if (angle === 180) lateral = -lateral
  } else {
    lateral = g.y
    vertical = Math.hypot(g.x, g.z)
    if (angle === 90 || angle === 270) lateral = -lateral
  }

  return (Math.atan2(lateral, vertical || 1) * 180) / Math.PI
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

  let status: SensorStatus = 'idle'
  let orientHandler: ((e: DeviceOrientationEvent) => void) | null = null
  let motionHandler:  ((e: DeviceMotionEvent) => void) | null      = null
  let noDataTimer:    ReturnType<typeof setTimeout> | null          = null
  let receivingData  = false
  let lastOrientAt   = 0
  let orientDisabled = false
  let orientSamples: number[] = []

  let calibrationBuf: number[] = []
  let neutralTilt    = 0
  let calibrated     = false
  let smoothedTilt   = 0
  let currentLane    = Math.round(centerLane)
  let lastLaneEmit   = currentLane
  let lastLaneTime   = 0

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

  const checkOrientUseless = () => {
    if (orientSamples.length < 10) return
    const min = Math.min(...orientSamples)
    const max = Math.max(...orientSamples)
    if (max - min < 1.2) orientDisabled = true
  }

  const emitLaneIfChanged = (lane: number) => {
    const clamped = clampLane(lane, laneCount)
    const now = Date.now()
    if (clamped === lastLaneEmit) return
    if (now - lastLaneTime < MIN_LANE_CHANGE_MS) return
    lastLaneEmit = clamped
    lastLaneTime = now
    currentLane = clamped
    callbacks.onLane(clamped)
  }

  const processTiltSample = (raw: number) => {
    if (!Number.isFinite(raw)) return
    markActive()

    if (!calibrated) {
      calibrationBuf.push(raw)
      if (calibrationBuf.length >= CALIBRATION_COUNT) {
        neutralTilt  = calibrationBuf.reduce((a, b) => a + b, 0) / calibrationBuf.length
        smoothedTilt = neutralTilt
        calibrated   = true
        calibrationBuf = []
        currentLane  = Math.round(centerLane)
        lastLaneEmit = currentLane
      }
      return
    }

    smoothedTilt = smoothedTilt + SMOOTHING_ALPHA * (raw - smoothedTilt)
    const relative = smoothedTilt - neutralTilt

    if (Math.abs(relative) < DEAD_ZONE_DEG) return

    const idealLane = centerLane + relative / DEG_PER_LANE
    const targetLane = clampLane(Math.round(idealLane), laneCount)

    if (targetLane === currentLane) return

    const boundary = (targetLane + currentLane) / 2
    const boundaryTilt = (boundary - centerLane) * DEG_PER_LANE
    const crossed =
      targetLane > currentLane
        ? relative >= boundaryTilt
        : relative <= boundaryTilt

    if (crossed) emitLaneIfChanged(targetLane)
  }

  const attachListeners = (useOrientation: boolean, useMotion: boolean) => {
    lastOrientAt   = 0
    orientDisabled = false
    orientSamples  = []

    if (useOrientation) {
      orientHandler = (e: DeviceOrientationEvent) => {
        if (orientDisabled) return
        const tilt = getOrientationTiltDegrees(e)
        if (tilt == null) return

        orientSamples.push(tilt)
        if (orientSamples.length > 24) orientSamples.shift()
        checkOrientUseless()
        if (orientDisabled) return

        lastOrientAt = Date.now()
        processTiltSample(tilt)
      }
      window.addEventListener('deviceorientation', orientHandler, { passive: true })
    }

    if (useMotion) {
      motionHandler = (e: DeviceMotionEvent) => {
        const orientFresh = useOrientation && !orientDisabled && lastOrientAt > 0 &&
          Date.now() - lastOrientAt < ORIENT_STALE_MS
        if (orientFresh) return

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
    calibrationBuf = []
    neutralTilt    = 0
    calibrated     = false
    smoothedTilt   = 0
    currentLane    = Math.round(centerLane)
    lastLaneEmit   = currentLane
    lastLaneTime   = 0
    orientDisabled = false
    orientSamples  = []
    lastOrientAt   = 0
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

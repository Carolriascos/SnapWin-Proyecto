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

const DEAD_ZONE_DEG      = 1.2
const LANE_THRESHOLD_DEG = 2.1
const COOLDOWN_MS        = 60
const SMOOTHING_ALPHA    = 0.82
const CALIBRATION_COUNT  = 6
const NO_DATA_TIMEOUT_MS = 3000
const ORIENT_STALE_MS    = 500
const HORIZONTAL_SIGN    = -1

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
  return true
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
  if (screen.orientation?.angle != null) return screen.orientation.angle
  const o = window.orientation
  return typeof o === 'number' ? o : 0
}

function tiltFromGravity(ax: number, ay: number, az: number): number {
  const angle = screenAngle()
  let gx = ax, gy = ay
  if (angle === 90)                        { gx = -ay; gy =  ax }
  else if (angle === 180)                  { gx = -ax; gy = -ay }
  else if (angle === 270 || angle === -90) { gx =  ay; gy = -ax }
  const denom = Math.sqrt(gy * gy + az * az) || 1
  return  (Math.atan2(gx, denom) * 180) / Math.PI
}

function normalizeOrientationTilt(e: DeviceOrientationEvent): number | null {
  if (e.gamma == null || !Number.isFinite(e.gamma)) return null
  return e.gamma * HORIZONTAL_SIGN
}

function normalizeMotionTilt(e: DeviceMotionEvent): number | null {
  const g = e.accelerationIncludingGravity
  if (!g || g.x == null || g.y == null || g.z == null) return null
  return tiltFromGravity(g.x, g.y, g.z) * HORIZONTAL_SIGN
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
  let motionHandler:  ((e: DeviceMotionEvent) => void) | null      = null
  let noDataTimer:    ReturnType<typeof setTimeout> | null          = null
  let receivingData  = false
  let lastOrientAt   = 0
  let orientDisabled = false
  let orientSamples: number[] = []

  let calibrationBuf: number[] = []
  let neutralTilt   = 0
  let calibrated    = false
  let smoothedTilt  = 0
  let armed         = true
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

  const checkOrientUseless = () => {
    if (orientSamples.length < 8) return
    const min = Math.min(...orientSamples)
    const max = Math.max(...orientSamples)
    if (max - min < 1.5) orientDisabled = true
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
      }
      return
    }

    smoothedTilt = smoothedTilt + SMOOTHING_ALPHA * (raw - smoothedTilt)
    const relative = smoothedTilt - neutralTilt
    const now = Date.now()

    if (!armed) {
      if (Math.abs(relative) < DEAD_ZONE_DEG) armed = true
      return
    }

    if (now - lastChangeTime < COOLDOWN_MS) return

    if (relative > LANE_THRESHOLD_DEG) {
      callbacks.onTilt(1)   
      lastChangeTime = now
      armed = false
    } else if (relative < -LANE_THRESHOLD_DEG) {
      callbacks.onTilt(-1)  
      lastChangeTime = now
      armed = false
    }
  }

  const attachListeners = (useOrientation: boolean, useMotion: boolean) => {
    lastOrientAt   = 0
    orientDisabled = false
    orientSamples  = []

    if (useOrientation) {
      orientHandler = (e: DeviceOrientationEvent) => {
        if (orientDisabled) return
        const tilt = normalizeOrientationTilt(e)
        if (tilt == null) return
        orientSamples.push(tilt)
        if (orientSamples.length > 20) orientSamples.shift()
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
        const tilt = normalizeMotionTilt(e)
        if (tilt != null) processTiltSample(tilt)
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
    armed          = true
    lastChangeTime = 0
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

      if (caps.needsOrientationPermission) {
        const result = await requestSensorPermission(
          DeviceOrientationEvent as unknown as PermissionCtor,
        )
        if (result === 'denied') {
          if (caps.hasDeviceMotion) {
            const motionResult = await requestSensorPermission(
              DeviceMotionEvent as unknown as PermissionCtor,
            )
            if (motionResult === 'denied') { setStatus('denied'); return false }
            attachListeners(false, true)
            scheduleNoDataCheck()
            return true
          }
          setStatus('denied')
          return false
        }
      }

      attachListeners(caps.hasDeviceOrientation, caps.hasDeviceMotion)
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

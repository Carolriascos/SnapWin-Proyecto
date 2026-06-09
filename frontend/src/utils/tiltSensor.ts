export type TiltDirection = -1 | 1

export interface TiltSensorHandle {
  start: () => Promise<boolean>
  stop: () => void
}

const TILT_THRESHOLD = 15
const DEBOUNCE_MS = 300

export function createTiltSensor(
  onTilt: (dir: TiltDirection) => void,
  onActive: () => void,
  onInactive?: () => void,
): TiltSensorHandle {
  let lastTime = 0
  let lastGamma = 0
  let orientHandler: ((e: DeviceOrientationEvent) => void) | null = null
  let motionHandler: ((e: DeviceMotionEvent) => void) | null = null
  let active = false
  let checkTimer: ReturnType<typeof setTimeout> | null = null

  const fireTilt = (dir: TiltDirection) => {
    const now = Date.now()
    if (now - lastTime < DEBOUNCE_MS) return
    lastTime = now
    onTilt(dir)
  }

  const fromGamma = (gamma: number) => {
    if (gamma < -TILT_THRESHOLD) fireTilt(-1)
    else if (gamma > TILT_THRESHOLD) fireTilt(1)
  }

  const attachListeners = () => {
    orientHandler = (e: DeviceOrientationEvent) => {
      if (e.gamma == null) return
      if (!active) { active = true; onActive() }
      const gamma = e.gamma
      const delta = gamma - lastGamma
      lastGamma = gamma
      if (Math.abs(delta) > 3) fromGamma(gamma)
    }

    motionHandler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity ?? e.acceleration
      if (!acc) return
      const x = acc.x ?? 0
      if (Math.abs(x) < 2) return
      if (!active) { active = true; onActive() }
      if (x < -TILT_THRESHOLD / 2) fireTilt(-1)
      else if (x > TILT_THRESHOLD / 2) fireTilt(1)
    }

    window.addEventListener('deviceorientation', orientHandler)
    window.addEventListener('devicemotion', motionHandler)

    checkTimer = setTimeout(() => {
      if (!active) onInactive?.()
    }, 2500)
  }

  const requestPermissions = async (): Promise<boolean> => {
    const DevOrient = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>
    }
    const DevMotion = DeviceMotionEvent as typeof DeviceMotionEvent & {
      requestPermission?: () => Promise<string>
    }

    let granted = true

    if (typeof DevOrient.requestPermission === 'function') {
      try {
        const state = await DevOrient.requestPermission()
        if (state !== 'granted') granted = false
      } catch {
        granted = false
      }
    }

    if (granted && typeof DevMotion.requestPermission === 'function') {
      try {
        const state = await DevMotion.requestPermission()
        if (state !== 'granted') granted = false
      } catch {
        granted = false
      }
    }

    return granted
  }

  return {
    async start() {
      active = false
      const granted = await requestPermissions()
      if (granted) attachListeners()
      return granted
    },
    stop() {
      if (orientHandler) window.removeEventListener('deviceorientation', orientHandler)
      if (motionHandler) window.removeEventListener('devicemotion', motionHandler)
      if (checkTimer) clearTimeout(checkTimer)
      orientHandler = null
      motionHandler = null
      checkTimer = null
      active = false
    },
  }
}

export function needsSensorPermission(): boolean {
  const DevOrient = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<string>
  }
  return typeof DevOrient.requestPermission === 'function'
}

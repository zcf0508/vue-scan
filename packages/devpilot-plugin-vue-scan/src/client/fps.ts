const WINDOW_MS = 1000

let frameTimestamps: number[] = []
let rafId: number | null = null

function tick() {
  const now = performance.now()
  frameTimestamps.push(now)

  const cutoff = now - WINDOW_MS
  while (frameTimestamps.length > 0 && frameTimestamps[0] < cutoff) {
    frameTimestamps.shift()
  }

  rafId = requestAnimationFrame(tick)
}

function ensureRunning() {
  if (rafId === null) {
    rafId = requestAnimationFrame(tick)
  }
}

export function getCurrentFps(): number {
  ensureRunning()
  if (frameTimestamps.length < 2)
    return -1
  return Math.round(frameTimestamps.length * 1000 / WINDOW_MS)
}

export function stopFpsMonitor() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  frameTimestamps = []
}

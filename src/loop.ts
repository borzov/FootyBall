import type { BallState, World } from './types'
import { integrate, resolveWalls } from './physics'
import { drawBall } from './renderer'
import { reportBall } from './bridge'
import { FIXED_DT, MAX_FRAME_DT, RADIUS, HIT_RADIUS_FACTOR, REPORT_INTERVAL_MS } from './constants'

export interface LoopHandle {
  getBall: () => BallState
  setBall: (b: BallState) => void
  setWorld: (w: World) => void
  stop: () => void
}

// Starts the rAF simulation loop with a fixed-timestep accumulator so physics
// is frame-rate independent. Mutable holders are encapsulated here; physics
// itself stays pure.
export function startLoop(
  ctx: CanvasRenderingContext2D,
  initialBall: BallState,
  initialWorld: World,
): LoopHandle {
  let ball = initialBall
  let world = initialWorld
  let acc = 0
  let last = performance.now()
  let lastReport = 0
  let running = true

  function frame(now: number) {
    if (!running) return

    let dt = (now - last) / 1000
    last = now
    if (dt > MAX_FRAME_DT) dt = MAX_FRAME_DT
    acc += dt

    while (acc >= FIXED_DT) {
      ball = resolveWalls(integrate(ball, FIXED_DT), world)
      acc -= FIXED_DT
    }

    drawBall(ctx, ball, world)

    if (now - lastReport >= REPORT_INTERVAL_MS) {
      lastReport = now
      // Report the forgiving hit radius so the OS click-through zone matches
      // the pointer hit-test (lets a moving ball be clicked mid-air).
      void reportBall(ball.x, ball.y, RADIUS * HIT_RADIUS_FACTOR)
    }

    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)

  return {
    getBall: () => ball,
    setBall: (b) => { ball = b },
    setWorld: (w) => { world = w },
    stop: () => { running = false },
  }
}

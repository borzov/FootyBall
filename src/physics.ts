import type { BallState, World } from './types'
import { GRAVITY, AIR_FRICTION, RADIUS, RESTITUTION, ROLL_FRICTION, SLEEP_SPEED } from './constants'

// Semi-implicit Euler. Pure: returns a new BallState. dt in seconds.
export function integrate(ball: BallState, dt: number): BallState {
  if (ball.resting) return ball

  const vy = ball.vy + GRAVITY * dt
  const vx = ball.vx * (1 - AIR_FRICTION * dt)
  const x = ball.x + ball.vx * dt
  const y = ball.y + vy * dt
  // Spin proportional to horizontal velocity (rolling look).
  const angle = ball.angle + (ball.vx / RADIUS) * dt

  return { ...ball, x, y, vx, vy, angle }
}

// Resolves collisions with all four walls. Pure: returns a new BallState.
export function resolveWalls(ball: BallState, world: World): BallState {
  let { x, y, vx, vy } = ball

  // Left / right
  if (x < RADIUS) {
    x = RADIUS
    vx = -vx * RESTITUTION
  } else if (x > world.width - RADIUS) {
    x = world.width - RADIUS
    vx = -vx * RESTITUTION
  }

  // Top
  if (y < RADIUS) {
    y = RADIUS
    vy = -vy * RESTITUTION
  }

  // Floor
  let resting = false
  const floor = world.height - RADIUS
  if (y > floor) {
    y = floor
    vy = -vy * RESTITUTION
    vx = vx * ROLL_FRICTION
    if (Math.hypot(vx, vy) < SLEEP_SPEED) {
      vx = 0
      vy = 0
      resting = true
    }
  }

  return { ...ball, x, y, vx, vy, resting }
}

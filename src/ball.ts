import type { BallState, World } from './types'
import { RADIUS, KICK_UP, KICK_HORIZONTAL, KICK_HORIZONTAL_MAX } from './constants'

export function createBall(world: World): BallState {
  return { x: world.width / 2, y: RADIUS, vx: 0, vy: 0, angle: 0, resting: false }
}

// Click at (clickX, clickY) in CSS px. Kick is upward plus horizontal away from
// the click point relative to the ball center. Pure: returns a new BallState.
export function applyKick(ball: BallState, clickX: number, _clickY: number): BallState {
  const offset = ball.x - clickX
  let vx = ball.vx + offset * KICK_HORIZONTAL
  vx = Math.max(-KICK_HORIZONTAL_MAX, Math.min(KICK_HORIZONTAL_MAX, vx))
  return { ...ball, vx, vy: -KICK_UP, resting: false }
}

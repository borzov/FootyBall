import type { BallState } from './types'
import { RADIUS } from './constants'

// Draws a filled regular pentagon centered at (cx, cy) with circumradius r,
// rotated by `rot` radians (a vertex points along `rot`).
function fillPentagon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  rot: number,
  fill: string,
): void {
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = rot + (i * 2 * Math.PI) / 5
    const px = cx + Math.cos(a) * r
    const py = cy + Math.sin(a) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

// Draws a realistic soccer ball: a shaded white sphere with the classic
// black-pentagon pattern. Lighting is fixed in screen space (top-left
// highlight); the seam pattern rotates with ball.angle so spin is visible.
export function drawBall(
  ctx: CanvasRenderingContext2D,
  ball: BallState,
  world: { width: number; height: number },
): void {
  ctx.clearRect(0, 0, world.width, world.height)

  ctx.save()
  ctx.translate(ball.x, ball.y)

  // Sphere body with fixed top-left lighting (drawn before rotation).
  const grad = ctx.createRadialGradient(
    -RADIUS * 0.35, -RADIUS * 0.35, RADIUS * 0.1,
    0, 0, RADIUS,
  )
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(0.65, '#f1f1f1')
  grad.addColorStop(1, '#c7c7c7')

  ctx.beginPath()
  ctx.arc(0, 0, RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  // Rotating black-pentagon pattern, clipped to the ball silhouette so the
  // outer pentagons are cut off at the rim like a real ball.
  ctx.save()
  ctx.clip()
  ctx.rotate(ball.angle)

  const black = '#1b1b1b'
  const seam = '#3a3a3a'
  const centerR = RADIUS * 0.34
  const ringDist = RADIUS * 0.84
  const outerR = RADIUS * 0.32

  fillPentagon(ctx, 0, 0, centerR, -Math.PI / 2, black)

  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const cx = Math.cos(a) * ringDist
    const cy = Math.sin(a) * ringDist
    fillPentagon(ctx, cx, cy, outerR, a + Math.PI, black)
    // Seam from a central-pentagon vertex to the outer pentagon.
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * centerR, Math.sin(a) * centerR)
    ctx.lineTo(cx, cy)
    ctx.strokeStyle = seam
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  ctx.restore() // undo clip + rotation

  // Outline (fixed, not rotated).
  ctx.beginPath()
  ctx.arc(0, 0, RADIUS, 0, Math.PI * 2)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#2a2a2a'
  ctx.stroke()

  ctx.restore()
}

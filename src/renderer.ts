import type { BallState } from './types'
import { RADIUS } from './constants'

// Draws a simple soccer ball: white circle, black outline, and a rotating
// pentagon pattern so spin is visible. ctx is a 2D canvas context in CSS px.
export function drawBall(ctx: CanvasRenderingContext2D, ball: BallState, world: { width: number; height: number }): void {
  ctx.clearRect(0, 0, world.width, world.height)

  ctx.save()
  ctx.translate(ball.x, ball.y)
  ctx.rotate(ball.angle)

  ctx.beginPath()
  ctx.arc(0, 0, RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = '#111111'
  ctx.stroke()

  ctx.beginPath()
  const pr = RADIUS * 0.42
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const px = Math.cos(a) * pr
    const py = Math.sin(a) * pr
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = '#111111'
  ctx.fill()

  ctx.strokeStyle = '#111111'
  ctx.lineWidth = 2
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * pr, Math.sin(a) * pr)
    ctx.lineTo(Math.cos(a) * RADIUS, Math.sin(a) * RADIUS)
    ctx.stroke()
  }

  ctx.restore()
}

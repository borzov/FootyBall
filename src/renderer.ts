import type { BallState } from './types'
import type { Skin } from './skins'
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

// Draws the ball for the current frame. If the selected skin's image is ready,
// the skin (any of the user-pickable designs) is drawn spinning under fixed
// lighting; otherwise we fall back to the procedural classic so the ball is
// never blank while a skin decodes.
export function drawBall(
  ctx: CanvasRenderingContext2D,
  ball: BallState,
  world: { width: number; height: number },
  skin?: Skin,
): void {
  ctx.clearRect(0, 0, world.width, world.height)
  if (skin && skin.loaded) drawSkinnedBall(ctx, ball, skin.img)
  else drawClassicBall(ctx, ball)
}

// Draws a skin: the flat design spins with ball.angle inside the ball
// silhouette, then a fixed top-left highlight + rim darkening give it the
// rounded, lit-in-place look (so the shine stays put as the ball rolls).
function drawSkinnedBall(
  ctx: CanvasRenderingContext2D,
  ball: BallState,
  img: CanvasImageSource,
): void {
  ctx.save()
  ctx.translate(ball.x, ball.y)

  ctx.beginPath()
  ctx.arc(0, 0, RADIUS, 0, Math.PI * 2)
  ctx.clip()

  // Rotating design (the skin SVG fills a square whose inscribed circle is the
  // ball, so it maps cleanly to [-RADIUS, RADIUS]).
  ctx.save()
  ctx.rotate(ball.angle)
  ctx.drawImage(img, -RADIUS, -RADIUS, RADIUS * 2, RADIUS * 2)
  ctx.restore()

  // Fixed specular highlight (top-left).
  const hi = ctx.createRadialGradient(
    -RADIUS * 0.3, -RADIUS * 0.4, RADIUS * 0.05,
    -RADIUS * 0.3, -RADIUS * 0.4, RADIUS * 1.25,
  )
  hi.addColorStop(0, 'rgba(255,255,255,0.5)')
  hi.addColorStop(0.4, 'rgba(255,255,255,0.12)')
  hi.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = hi
  ctx.fillRect(-RADIUS, -RADIUS, RADIUS * 2, RADIUS * 2)

  // Fixed rim darkening for sphere roundness.
  const rim = ctx.createRadialGradient(0, 0, RADIUS * 0.6, 0, 0, RADIUS)
  rim.addColorStop(0, 'rgba(0,0,0,0)')
  rim.addColorStop(1, 'rgba(0,0,0,0.28)')
  ctx.fillStyle = rim
  ctx.fillRect(-RADIUS, -RADIUS, RADIUS * 2, RADIUS * 2)

  ctx.restore() // undo clip + translate

  // Outline (fixed, not rotated).
  ctx.save()
  ctx.translate(ball.x, ball.y)
  ctx.beginPath()
  ctx.arc(0, 0, RADIUS, 0, Math.PI * 2)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.stroke()
  ctx.restore()
}

// Procedural fallback: a shaded white sphere with the classic black-pentagon
// pattern. Lighting is fixed in screen space (top-left highlight); the seam
// pattern rotates with ball.angle so spin is visible.
function drawClassicBall(
  ctx: CanvasRenderingContext2D,
  ball: BallState,
): void {
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

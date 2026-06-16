import './styles.css'
import { createBall, applyKick } from './ball'
import { startLoop } from './loop'
import { initBallSelection, currentSkin } from './ballSelection'
import { RADIUS, HIT_RADIUS_FACTOR } from './constants'
import type { World } from './types'

const canvas = document.getElementById('stage') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

function currentWorld(): World {
  return { width: window.innerWidth, height: window.innerHeight }
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(window.innerWidth * dpr)
  canvas.height = Math.round(window.innerHeight * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

resizeCanvas()

initBallSelection()

const world = currentWorld()
const handle = startLoop(ctx, createBall(world), world, currentSkin)

canvas.addEventListener('pointerdown', (e) => {
  const ball = handle.getBall()
  const dx = e.clientX - ball.x
  const dy = e.clientY - ball.y
  // Forgiving hit zone so a ball in flight can still be kicked.
  if (Math.hypot(dx, dy) <= RADIUS * HIT_RADIUS_FACTOR) {
    handle.setBall(applyKick(ball, e.clientX, e.clientY))
  }
})

window.addEventListener('resize', () => {
  resizeCanvas()
  const w = currentWorld()
  handle.setWorld(w)
  const b = handle.getBall()
  handle.setBall({
    ...b,
    x: Math.max(RADIUS, Math.min(w.width - RADIUS, b.x)),
    y: Math.max(RADIUS, Math.min(w.height - RADIUS, b.y)),
  })
})

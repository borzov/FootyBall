import './styles.css'
import { createBall, applyKick } from './ball'
import { startLoop } from './loop'
import { RADIUS } from './constants'
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

const world = currentWorld()
const handle = startLoop(ctx, createBall(world), world)

canvas.addEventListener('pointerdown', (e) => {
  const ball = handle.getBall()
  const dx = e.clientX - ball.x
  const dy = e.clientY - ball.y
  if (Math.hypot(dx, dy) <= RADIUS) {
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

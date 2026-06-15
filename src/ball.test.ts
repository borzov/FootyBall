import { describe, it, expect } from 'vitest'
import { createBall, applyKick } from './ball'
import { KICK_UP, KICK_HORIZONTAL, KICK_HORIZONTAL_MAX, RADIUS } from './constants'
import type { World } from './types'

const world: World = { width: 800, height: 600 }

describe('createBall', () => {
  it('starts horizontally centered, above the floor, at rest', () => {
    const ball = createBall(world)
    expect(ball.x).toBe(world.width / 2)
    expect(ball.y).toBe(RADIUS)
    expect(ball.vx).toBe(0)
    expect(ball.vy).toBe(0)
    expect(ball.resting).toBe(false)
  })
})

describe('applyKick', () => {
  it('sends the ball upward and wakes it', () => {
    const ball = { ...createBall(world), resting: true, vy: 0 }
    const kicked = applyKick(ball, ball.x, ball.y)
    expect(kicked.vy).toBe(-KICK_UP)
    expect(kicked.resting).toBe(false)
  })

  it('kicks horizontally away from the click point', () => {
    const ball = createBall(world)
    const kicked = applyKick(ball, ball.x + 10, ball.y)
    expect(kicked.vx).toBeCloseTo(-10 * KICK_HORIZONTAL, 5)
  })

  it('clamps the horizontal kick magnitude', () => {
    const ball = createBall(world)
    const kicked = applyKick(ball, ball.x + 100000, ball.y)
    expect(kicked.vx).toBe(-KICK_HORIZONTAL_MAX)
  })

  it('does not mutate the input', () => {
    const ball = createBall(world)
    applyKick(ball, ball.x + 10, ball.y)
    expect(ball.vx).toBe(0)
  })
})

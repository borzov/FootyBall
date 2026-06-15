import { describe, it, expect } from 'vitest'
import { integrate, resolveWalls } from './physics'
import { GRAVITY, RADIUS, RESTITUTION } from './constants'
import type { BallState, World } from './types'

const base: BallState = { x: 100, y: 100, vx: 50, vy: 0, angle: 0, resting: false }

const world: World = { width: 800, height: 600 }

describe('integrate', () => {
  it('applies gravity to vertical velocity', () => {
    const next = integrate(base, 0.5)
    expect(next.vy).toBeCloseTo(GRAVITY * 0.5, 5)
  })

  it('advances position by velocity * dt (semi-implicit Euler)', () => {
    const next = integrate(base, 0.5)
    expect(next.x).toBeCloseTo(100 + 50 * 0.5, 5)
    expect(next.y).toBeCloseTo(100 + GRAVITY * 0.5 * 0.5, 5)
  })

  it('does not mutate the input', () => {
    integrate(base, 0.5)
    expect(base.vy).toBe(0)
    expect(base.x).toBe(100)
  })

  it('does not apply gravity when resting', () => {
    const resting: BallState = { ...base, vx: 0, vy: 0, resting: true }
    const next = integrate(resting, 0.5)
    expect(next.vy).toBe(0)
    expect(next.y).toBe(100)
  })
})

describe('resolveWalls', () => {
  it('bounces off the left wall with restitution and clamps inside', () => {
    const ball: BallState = { x: RADIUS - 10, y: 300, vx: -200, vy: 0, angle: 0, resting: false }
    const next = resolveWalls(ball, world)
    expect(next.x).toBe(RADIUS)
    expect(next.vx).toBeCloseTo(200 * RESTITUTION, 5)
  })

  it('bounces off the right wall', () => {
    const ball: BallState = { x: world.width - RADIUS + 10, y: 300, vx: 200, vy: 0, angle: 0, resting: false }
    const next = resolveWalls(ball, world)
    expect(next.x).toBe(world.width - RADIUS)
    expect(next.vx).toBeCloseTo(-200 * RESTITUTION, 5)
  })

  it('bounces off the top wall', () => {
    const ball: BallState = { x: 400, y: RADIUS - 5, vx: 0, vy: -300, angle: 0, resting: false }
    const next = resolveWalls(ball, world)
    expect(next.y).toBe(RADIUS)
    expect(next.vy).toBeCloseTo(300 * RESTITUTION, 5)
  })

  it('bounces off the floor', () => {
    const ball: BallState = { x: 400, y: world.height - RADIUS + 5, vx: 0, vy: 400, angle: 0, resting: false }
    const next = resolveWalls(ball, world)
    expect(next.y).toBe(world.height - RADIUS)
    expect(next.vy).toBeCloseTo(-400 * RESTITUTION, 5)
  })

  it('sleeps on the floor when motion is negligible', () => {
    const ball: BallState = { x: 400, y: world.height - RADIUS + 1, vx: 5, vy: 10, angle: 0, resting: false }
    const next = resolveWalls(ball, world)
    expect(next.resting).toBe(true)
    expect(next.vx).toBe(0)
    expect(next.vy).toBe(0)
    expect(next.y).toBe(world.height - RADIUS)
  })

  it('does not sleep when moving fast on the floor', () => {
    const ball: BallState = { x: 400, y: world.height - RADIUS + 1, vx: 0, vy: 400, angle: 0, resting: false }
    const next = resolveWalls(ball, world)
    expect(next.resting).toBe(false)
  })

  it('does not mutate the input', () => {
    const ball: BallState = { x: RADIUS - 10, y: 300, vx: -200, vy: 0, angle: 0, resting: false }
    resolveWalls(ball, world)
    expect(ball.x).toBe(RADIUS - 10)
  })
})

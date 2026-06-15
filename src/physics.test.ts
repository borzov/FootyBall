import { describe, it, expect } from 'vitest'
import { integrate } from './physics'
import { GRAVITY } from './constants'
import type { BallState } from './types'

const base: BallState = { x: 100, y: 100, vx: 50, vy: 0, angle: 0, resting: false }

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

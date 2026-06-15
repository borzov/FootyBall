export interface BallState {
  readonly x: number      // CSS px, center of the ball
  readonly y: number
  readonly vx: number     // CSS px / second
  readonly vy: number
  readonly angle: number  // radians, for rolling spin
  readonly resting: boolean
}

export interface World {
  readonly width: number   // CSS px
  readonly height: number  // CSS px
}

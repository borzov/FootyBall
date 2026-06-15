// All tunable simulation parameters live here. Units: CSS px and seconds.
export const RADIUS = 32              // ball radius in CSS px
export const GRAVITY = 2400           // downward acceleration, px/s^2
export const RESTITUTION = 0.75       // energy kept per bounce (0..1)
export const ROLL_FRICTION = 0.8      // horizontal velocity kept per second on floor
export const AIR_FRICTION = 0.02      // fraction of horizontal velocity lost per second in air
export const SLEEP_SPEED = 25         // below this total speed on the floor, the ball sleeps (px/s)
export const FIXED_DT = 1 / 120       // physics step in seconds
export const MAX_FRAME_DT = 0.1       // clamp huge frame gaps (tab inactive) in seconds

// Kick tuning
export const KICK_UP = 1100           // upward impulse magnitude, px/s
export const KICK_HORIZONTAL = 6      // horizontal velocity per px of click offset from center
export const KICK_HORIZONTAL_MAX = 900 // clamp horizontal kick, px/s

// Backend reporting throttle
export const REPORT_INTERVAL_MS = 33  // ~30 Hz position reports to Rust

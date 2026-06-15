// All tunable simulation parameters live here. Units: CSS px and seconds.
export const RADIUS = 32              // ball radius in CSS px

// Motion is time-scaled to ~75% speed vs. the original tuning: gravity is
// scaled by 0.75^2 and all impulse velocities by 0.75, which keeps bounce
// heights/trajectory shapes identical while playing them back 25% slower.
export const GRAVITY = 1350           // downward acceleration, px/s^2
export const RESTITUTION = 0.75       // energy kept per bounce (0..1)
export const ROLL_FRICTION = 0.8      // horizontal velocity kept per second on floor
export const AIR_FRICTION = 0.02      // fraction of horizontal velocity lost per second in air
export const SLEEP_SPEED = 19         // below this total speed on the floor, the ball sleeps (px/s)
export const FIXED_DT = 1 / 120       // physics step in seconds
export const MAX_FRAME_DT = 0.1       // clamp huge frame gaps (tab inactive) in seconds

// Kick tuning
export const KICK_UP = 825            // upward impulse magnitude, px/s
export const KICK_HORIZONTAL = 4.5    // horizontal velocity per px of click offset from center
export const KICK_HORIZONTAL_MAX = 675 // clamp horizontal kick, px/s

// Clickable area is larger than the visible ball so a moving ball can still be
// kicked mid-air. Used by the pointer hit-test and the backend click-through zone.
export const HIT_RADIUS_FACTOR = 1.5

// Backend reporting throttle
export const REPORT_INTERVAL_MS = 33  // ~30 Hz position reports to Rust

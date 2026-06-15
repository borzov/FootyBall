# Football Tray Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A lightweight cross-platform tray/menubar app showing a transparent always-on-top soccer ball that bounces with natural physics and is kicked by clicking it, while clicks elsewhere pass through.

**Architecture:** Tauri v2 app. The webview runs the physics simulation and Canvas rendering; Rust owns the transparent overlay window, the tray menu, autostart, and a global-cursor polling loop that toggles `ignore_cursor_events` so only the ball is clickable. The frontend reports the ball position to Rust each frame; Rust converts it to global physical screen coordinates and hit-tests against the live cursor.

**Tech Stack:** Tauri v2, Rust, TypeScript, Vite, HTML Canvas 2D, vitest (frontend unit tests), `tauri-plugin-autostart`.

---

## File Structure

Frontend (`src/`):
- `constants.ts` — all tunable physics/world/kick constants (no hardcoded magic numbers elsewhere).
- `types.ts` — shared `BallState` and `World` types.
- `physics.ts` — pure functions: `integrate`, `resolveWalls`. No DOM.
- `ball.ts` — pure `createBall`, `applyKick`. No DOM.
- `renderer.ts` — draws the ball sprite + rotation on a canvas context.
- `bridge.ts` — thin wrapper over Tauri `invoke`/window APIs (report ball pos, resize).
- `loop.ts` — fixed-timestep accumulator rAF loop wiring physics → render → bridge.
- `main.ts` — bootstrap: canvas setup, pointer handler, start loop.

Backend (`src-tauri/src/`):
- `lib.rs` — app builder, plugin registration, shared state, commands, wiring.
- `overlay.rs` — overlay window configuration helper.
- `cursor.rs` — pure `is_cursor_on_ball` helper + the polling loop + ignore-events toggle.
- `tray.rs` — tray icon + menu (Show/Hide, Launch at login, Quit) + event handling.

Config:
- `src-tauri/tauri.conf.json` — window + bundle config.
- `src-tauri/Cargo.toml`, `package.json` — dependencies.

---

## Task 0: Scaffold the Tauri v2 project

**Files:**
- Create: project skeleton via scaffolding tool, then trim.

- [ ] **Step 1: Scaffold with the Tauri create tool (vanilla TypeScript)**

Run from the project root (`/Users/borzov/Develop/Public/football`):

```bash
npm create tauri-app@latest . -- --template vanilla-ts --manager npm --yes
```

Expected: creates `package.json`, `index.html`, `src/`, `src-tauri/` without overwriting `docs/`. If the tool refuses because the directory is non-empty, scaffold into `./_scaffold` and move files out:

```bash
npm create tauri-app@latest _scaffold -- --template vanilla-ts --manager npm --yes
cp -R _scaffold/. . && rm -rf _scaffold
```

- [ ] **Step 2: Install dependencies and add the autostart plugin + vitest**

```bash
npm install
npm install @tauri-apps/plugin-autostart
npm install -D vitest
( cd src-tauri && cargo add tauri-plugin-autostart )
```

Expected: all installs succeed; `src-tauri/Cargo.toml` now lists `tauri-plugin-autostart`.

- [ ] **Step 3: Add the test script to package.json**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 4: Verify the dev build compiles**

```bash
npm run tauri dev
```

Expected: a window opens with the default template. Close it (Ctrl+C). This confirms the toolchain works before we customize.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Tauri v2 vanilla-ts project with vitest and autostart plugin"
```

---

## Task 1: Constants and shared types

**Files:**
- Create: `src/constants.ts`
- Create: `src/types.ts`

- [ ] **Step 1: Create the types module**

`src/types.ts`:

```typescript
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
```

- [ ] **Step 2: Create the constants module**

`src/constants.ts`:

```typescript
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
```

- [ ] **Step 3: Verify it type-checks**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/constants.ts src/types.ts
git commit -m "feat: add physics constants and shared types"
```

---

## Task 2: Physics — integration step (gravity + motion)

**Files:**
- Create: `src/physics.ts`
- Test: `src/physics.test.ts`

- [ ] **Step 1: Write the failing test**

`src/physics.test.ts`:

```typescript
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
    // y uses the updated vy (semi-implicit): y += (g*dt) * dt
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/physics.test.ts
```

Expected: FAIL — `integrate` is not exported / not defined.

- [ ] **Step 3: Write minimal implementation**

`src/physics.ts`:

```typescript
import type { BallState } from './types'
import { GRAVITY, AIR_FRICTION, RADIUS } from './constants'

// Semi-implicit Euler. Pure: returns a new BallState. dt in seconds.
export function integrate(ball: BallState, dt: number): BallState {
  if (ball.resting) return ball

  const vy = ball.vy + GRAVITY * dt
  const vx = ball.vx * (1 - AIR_FRICTION * dt)
  const x = ball.x + vx * dt
  const y = ball.y + vy * dt
  // Spin proportional to horizontal velocity (rolling look).
  const angle = ball.angle + (vx / RADIUS) * dt

  return { ...ball, x, y, vx, vy, angle }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/physics.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/physics.ts src/physics.test.ts
git commit -m "feat: add semi-implicit Euler integration step"
```

---

## Task 3: Physics — wall collisions, friction, and sleep

**Files:**
- Modify: `src/physics.ts`
- Modify: `src/physics.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/physics.test.ts`:

```typescript
import { resolveWalls } from './physics'
import { RADIUS, RESTITUTION, SLEEP_SPEED } from './constants'
import type { World } from './types'

const world: World = { width: 800, height: 600 }

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/physics.test.ts
```

Expected: FAIL — `resolveWalls` not defined.

- [ ] **Step 3: Write the implementation**

Append to `src/physics.ts`:

```typescript
import { RESTITUTION, ROLL_FRICTION, SLEEP_SPEED } from './constants'
import type { World } from './types'

// Resolves collisions with all four walls. Pure: returns a new BallState.
export function resolveWalls(ball: BallState, world: World): BallState {
  let { x, y, vx, vy } = ball

  // Left / right
  if (x < RADIUS) {
    x = RADIUS
    vx = -vx * RESTITUTION
  } else if (x > world.width - RADIUS) {
    x = world.width - RADIUS
    vx = -vx * RESTITUTION
  }

  // Top
  if (y < RADIUS) {
    y = RADIUS
    vy = -vy * RESTITUTION
  }

  // Floor
  let resting = false
  const floor = world.height - RADIUS
  if (y > floor) {
    y = floor
    vy = -vy * RESTITUTION
    // Rolling friction along the floor (applied as a per-bounce damping).
    vx = vx * ROLL_FRICTION
    // Sleep when total speed on the floor is negligible to kill jitter.
    if (Math.hypot(vx, vy) < SLEEP_SPEED) {
      vx = 0
      vy = 0
      resting = true
    }
  }

  return { ...ball, x, y, vx, vy, resting }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/physics.test.ts
```

Expected: PASS (all integrate + resolveWalls tests).

- [ ] **Step 5: Commit**

```bash
git add src/physics.ts src/physics.test.ts
git commit -m "feat: add wall collisions, rolling friction, and sleep threshold"
```

---

## Task 4: Ball creation and kick impulse

**Files:**
- Create: `src/ball.ts`
- Test: `src/ball.test.ts`

- [ ] **Step 1: Write the failing test**

`src/ball.test.ts`:

```typescript
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
    // Click to the RIGHT of center -> ball goes LEFT (negative vx).
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/ball.test.ts
```

Expected: FAIL — `createBall` / `applyKick` not defined.

- [ ] **Step 3: Write the implementation**

`src/ball.ts`:

```typescript
import type { BallState, World } from './types'
import { RADIUS, KICK_UP, KICK_HORIZONTAL, KICK_HORIZONTAL_MAX } from './constants'

export function createBall(world: World): BallState {
  return { x: world.width / 2, y: RADIUS, vx: 0, vy: 0, angle: 0, resting: false }
}

// Click at (clickX, clickY) in CSS px. Kick is upward plus horizontal away from
// the click point relative to the ball center. Pure: returns a new BallState.
export function applyKick(ball: BallState, clickX: number, _clickY: number): BallState {
  const offset = ball.x - clickX // click right of center -> negative -> ball goes left
  let vx = ball.vx + offset * KICK_HORIZONTAL
  vx = Math.max(-KICK_HORIZONTAL_MAX, Math.min(KICK_HORIZONTAL_MAX, vx))
  return { ...ball, vx, vy: -KICK_UP, resting: false }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/ball.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ball.ts src/ball.test.ts
git commit -m "feat: add ball creation and click-to-kick impulse"
```

---

## Task 5: Renderer

**Files:**
- Create: `src/renderer.ts`

(No unit test: pure Canvas drawing is verified visually during integration.)

- [ ] **Step 1: Write the renderer**

`src/renderer.ts`:

```typescript
import type { BallState } from './types'
import { RADIUS } from './constants'

// Draws a simple soccer ball: white circle, black outline, and a rotating
// pentagon pattern so spin is visible. ctx is a 2D canvas context in CSS px.
export function drawBall(ctx: CanvasRenderingContext2D, ball: BallState, world: { width: number; height: number }): void {
  ctx.clearRect(0, 0, world.width, world.height)

  ctx.save()
  ctx.translate(ball.x, ball.y)
  ctx.rotate(ball.angle)

  // Body
  ctx.beginPath()
  ctx.arc(0, 0, RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = '#111111'
  ctx.stroke()

  // Center pentagon (black) to make rotation visible
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

  // Spokes from pentagon vertices outward
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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer.ts
git commit -m "feat: add canvas soccer-ball renderer with visible spin"
```

---

## Task 6: Backend bridge wrapper

**Files:**
- Create: `src/bridge.ts`

- [ ] **Step 1: Write the bridge**

`src/bridge.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core'

// Reports the ball's current screen circle (CSS px, relative to the window)
// to Rust so the cursor loop can hit-test it. Best-effort: ignore failures
// (e.g. running outside Tauri during tests).
export async function reportBall(x: number, y: number, r: number): Promise<void> {
  try {
    await invoke('update_ball', { x, y, r })
  } catch {
    // not running inside Tauri or command unavailable — safe to ignore
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/bridge.ts
git commit -m "feat: add Tauri bridge wrapper for reporting ball position"
```

---

## Task 7: Fixed-timestep loop

**Files:**
- Create: `src/loop.ts`

- [ ] **Step 1: Write the loop**

`src/loop.ts`:

```typescript
import type { BallState, World } from './types'
import { integrate, resolveWalls } from './physics'
import { drawBall } from './renderer'
import { reportBall } from './bridge'
import { FIXED_DT, MAX_FRAME_DT, RADIUS, REPORT_INTERVAL_MS } from './constants'

export interface LoopHandle {
  getBall: () => BallState
  setBall: (b: BallState) => void
  setWorld: (w: World) => void
  stop: () => void
}

// Starts the rAF simulation loop with a fixed-timestep accumulator so physics
// is frame-rate independent. Mutable holders are encapsulated here; physics
// itself stays pure.
export function startLoop(
  ctx: CanvasRenderingContext2D,
  initialBall: BallState,
  initialWorld: World,
): LoopHandle {
  let ball = initialBall
  let world = initialWorld
  let acc = 0
  let last = performance.now()
  let lastReport = 0
  let running = true

  function frame(now: number) {
    if (!running) return

    let dt = (now - last) / 1000
    last = now
    if (dt > MAX_FRAME_DT) dt = MAX_FRAME_DT
    acc += dt

    while (acc >= FIXED_DT) {
      ball = resolveWalls(integrate(ball, FIXED_DT), world)
      acc -= FIXED_DT
    }

    drawBall(ctx, ball, world)

    if (now - lastReport >= REPORT_INTERVAL_MS) {
      lastReport = now
      void reportBall(ball.x, ball.y, RADIUS)
    }

    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)

  return {
    getBall: () => ball,
    setBall: (b) => { ball = b },
    setWorld: (w) => { world = w },
    stop: () => { running = false },
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/loop.ts
git commit -m "feat: add fixed-timestep rAF simulation loop"
```

---

## Task 8: Frontend bootstrap

**Files:**
- Modify: `index.html`
- Replace: `src/main.ts`
- Create/replace: `src/styles.css`

- [ ] **Step 1: Set up the transparent full-window canvas markup**

Replace `index.html` body with a single full-screen canvas (keep the existing `<head>`/script include, pointing the module at `/src/main.ts`):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/src/styles.css" />
    <title>Football</title>
  </head>
  <body>
    <canvas id="stage"></canvas>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Transparent, non-scrolling styles**

`src/styles.css`:

```css
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
}
#stage {
  display: block;
  width: 100vw;
  height: 100vh;
}
```

- [ ] **Step 3: Bootstrap canvas, DPR scaling, kick handler, resize, loop**

Replace `src/main.ts`:

```typescript
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

// Size the canvas backing store to device pixels but draw in CSS px.
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(window.innerWidth * dpr)
  canvas.height = Math.round(window.innerHeight * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

resizeCanvas()

const world = currentWorld()
const handle = startLoop(ctx, createBall(world), world)

// Click-to-kick: only fires when Rust has enabled cursor events (cursor over ball).
canvas.addEventListener('pointerdown', (e) => {
  const ball = handle.getBall()
  const dx = e.clientX - ball.x
  const dy = e.clientY - ball.y
  if (Math.hypot(dx, dy) <= RADIUS) {
    handle.setBall(applyKick(ball, e.clientX, e.clientY))
  }
})

// Keep the world in sync and clamp the ball inside on resolution/size changes.
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
```

- [ ] **Step 4: Type-check and run unit tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: type-check clean; all physics/ball tests pass.

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.ts src/styles.css
git commit -m "feat: wire frontend bootstrap, DPR canvas, kick handler, resize"
```

---

## Task 9: Configure the overlay window (tauri.conf.json)

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Configure a transparent, borderless, always-on-top overlay**

In `src-tauri/tauri.conf.json`, set the `app.windows[0]` entry to:

```json
{
  "label": "main",
  "title": "Football",
  "transparent": true,
  "decorations": false,
  "alwaysOnTop": true,
  "skipTaskbar": true,
  "shadow": false,
  "resizable": false,
  "focus": false,
  "fullscreen": false,
  "width": 800,
  "height": 600
}
```

Also ensure `app.macOSPrivateApi` is `true` (required for true window transparency on macOS):

```json
"app": {
  "macOSPrivateApi": true,
  "windows": [ /* the object above */ ]
}
```

- [ ] **Step 2: Verify config parses**

```bash
( cd src-tauri && cargo tauri info ) || npx tauri info
```

Expected: no JSON parse error reported for `tauri.conf.json`.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat: configure transparent borderless always-on-top overlay window"
```

---

## Task 10: Overlay sizing helper (fit to primary monitor work area)

**Files:**
- Create: `src-tauri/src/overlay.rs`

- [ ] **Step 1: Write the overlay helper**

`src-tauri/src/overlay.rs`:

```rust
use tauri::{Manager, WebviewWindow};

// Resize and position the overlay to cover the primary monitor work area,
// then enable click-through by default. Called once at startup.
pub fn setup_overlay(window: &WebviewWindow) -> tauri::Result<()> {
    if let Some(monitor) = window.primary_monitor()? {
        let size = monitor.size();
        let pos = monitor.position();
        window.set_position(tauri::PhysicalPosition::new(pos.x, pos.y))?;
        window.set_size(tauri::PhysicalSize::new(size.width, size.height))?;
    }
    // Click-through everywhere until the cursor loop detects the ball.
    window.set_ignore_cursor_events(true)?;
    window.show()?;
    Ok(())
}
```

- [ ] **Step 2: Build to verify it compiles (after wiring in Task 13, this is re-checked)**

Compilation is exercised in Task 13 once `mod overlay;` is added. For now:

```bash
( cd src-tauri && cargo check )
```

Expected: may warn "unused" until wired; must not error on syntax.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/overlay.rs
git commit -m "feat: add overlay sizing helper for primary monitor work area"
```

---

## Task 11: Cursor hit-test helper + polling loop

**Files:**
- Create: `src-tauri/src/cursor.rs`

- [ ] **Step 1: Write the failing pure-helper test**

Create `src-tauri/src/cursor.rs` with the helper and its test:

```rust
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Manager, WebviewWindow};

// Ball position reported by the frontend, in CSS px relative to the window.
#[derive(Default, Clone, Copy)]
pub struct BallPos {
    pub x: f64,
    pub y: f64,
    pub r: f64,
    pub valid: bool,
}

pub struct BallState(pub Mutex<BallPos>);

// Pure hit-test: is the global physical cursor within the ball circle?
// All inputs are physical screen pixels.
pub fn is_cursor_on_ball(
    cursor_x: f64,
    cursor_y: f64,
    ball_phys_x: f64,
    ball_phys_y: f64,
    ball_phys_r: f64,
) -> bool {
    let dx = cursor_x - ball_phys_x;
    let dy = cursor_y - ball_phys_y;
    (dx * dx + dy * dy).sqrt() <= ball_phys_r
}

#[cfg(test)]
mod tests {
    use super::is_cursor_on_ball;

    #[test]
    fn inside_circle_is_true() {
        assert!(is_cursor_on_ball(105.0, 100.0, 100.0, 100.0, 32.0));
    }

    #[test]
    fn outside_circle_is_false() {
        assert!(!is_cursor_on_ball(200.0, 100.0, 100.0, 100.0, 32.0));
    }

    #[test]
    fn exactly_on_edge_is_true() {
        assert!(is_cursor_on_ball(132.0, 100.0, 100.0, 100.0, 32.0));
    }
}
```

- [ ] **Step 2: Run the helper test to verify it passes**

```bash
( cd src-tauri && cargo test cursor::tests )
```

Expected: 3 tests PASS. (If `mod cursor;` is not yet declared, add it temporarily or proceed — it is declared in Task 13.)

- [ ] **Step 3: Add the polling loop**

Append to `src-tauri/src/cursor.rs`:

```rust
// Spawns a background loop that, ~60 times per second, reads the global cursor
// position and toggles ignore_cursor_events so only the ball is clickable.
// Converts the frontend's CSS-px ball position into global physical pixels
// using the window's outer position and scale factor.
pub fn spawn_cursor_loop(window: WebviewWindow) {
    std::thread::spawn(move || {
        let mut currently_ignoring = true;
        loop {
            std::thread::sleep(Duration::from_millis(16));

            let ball = {
                let state = window.state::<BallState>();
                let guard = state.0.lock().unwrap();
                *guard
            };

            let mut should_ignore = true;
            if ball.valid {
                if let (Ok(cursor), Ok(outer), Ok(scale)) = (
                    window.cursor_position(),
                    window.outer_position(),
                    window.scale_factor(),
                ) {
                    let ball_phys_x = outer.x as f64 + ball.x * scale;
                    let ball_phys_y = outer.y as f64 + ball.y * scale;
                    let ball_phys_r = ball.r * scale;
                    let on_ball =
                        is_cursor_on_ball(cursor.x, cursor.y, ball_phys_x, ball_phys_y, ball_phys_r);
                    should_ignore = !on_ball;
                }
            }

            if should_ignore != currently_ignoring {
                let _ = window.set_ignore_cursor_events(should_ignore);
                currently_ignoring = should_ignore;
            }
        }
    });
}
```

- [ ] **Step 4: Compile-check**

```bash
( cd src-tauri && cargo check )
```

Expected: no errors (may warn about unused until wired in Task 13).

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/cursor.rs
git commit -m "feat: add cursor hit-test helper and global-cursor polling loop"
```

---

## Task 12: Tray icon and menu

**Files:**
- Create: `src-tauri/src/tray.rs`

- [ ] **Step 1: Write the tray module**

`src-tauri/src/tray.rs`:

```rust
use tauri::{
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    App, Manager,
};
use tauri_plugin_autostart::ManagerExt;

// Builds the tray icon with: Show/Hide ball, Launch at login (checkbox), Quit.
pub fn setup_tray(app: &App) -> tauri::Result<()> {
    let autostart_enabled = app.autolaunch().is_enabled().unwrap_or(false);

    let toggle = MenuItemBuilder::with_id("toggle", "Hide ball").build(app)?;
    let autostart = CheckMenuItemBuilder::with_id("autostart", "Launch at login")
        .checked(autostart_enabled)
        .build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[&toggle, &autostart])
        .separator()
        .items(&[&quit])
        .build()?;

    TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "toggle" => {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                        let _ = toggle.set_text("Show ball");
                    } else {
                        let _ = window.show();
                        let _ = toggle.set_text("Hide ball");
                    }
                }
            }
            "autostart" => {
                let manager = app.autolaunch();
                let enabled = manager.is_enabled().unwrap_or(false);
                if enabled {
                    let _ = manager.disable();
                } else {
                    let _ = manager.enable();
                }
                let _ = autostart.set_checked(manager.is_enabled().unwrap_or(false));
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}
```

- [ ] **Step 2: Compile-check**

```bash
( cd src-tauri && cargo check )
```

Expected: no errors (unused warning until wired in Task 13).

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/tray.rs
git commit -m "feat: add tray menu with show/hide, autostart toggle, quit"
```

---

## Task 13: Wire everything in lib.rs

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Replace lib.rs with the full wiring**

`src-tauri/src/lib.rs`:

```rust
mod cursor;
mod overlay;
mod tray;

use cursor::{BallPos, BallState};
use tauri::Manager;

// Command: frontend reports the ball's current circle (CSS px, window-relative).
#[tauri::command]
fn update_ball(state: tauri::State<BallState>, x: f64, y: f64, r: f64) {
    let mut guard = state.0.lock().unwrap();
    *guard = BallPos { x, y, r, valid: true };
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(BallState(std::sync::Mutex::new(BallPos::default())))
        .invoke_handler(tauri::generate_handler![update_ball])
        .setup(|app| {
            let window = app.get_webview_window("main").expect("main window");
            overlay::setup_overlay(&window)?;
            tray::setup_tray(app)?;
            cursor::spawn_cursor_loop(window);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: Ensure main.rs calls run()**

Confirm `src-tauri/src/main.rs` is the scaffold default:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    app_lib::run()
}
```

(The crate name `app_lib` is whatever the scaffold generated in `Cargo.toml` under `[lib] name`; keep it consistent — do not rename.)

- [ ] **Step 3: Build the whole backend**

```bash
( cd src-tauri && cargo check && cargo test )
```

Expected: compiles; cursor helper tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/src/main.rs
git commit -m "feat: wire overlay, tray, cursor loop, and update_ball command"
```

---

## Task 14: Capabilities/permissions for autostart + window APIs

**Files:**
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Add required permissions**

In `src-tauri/capabilities/default.json`, ensure the `permissions` array includes the core window and autostart permissions used at runtime:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capability for the football overlay",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-set-ignore-cursor-events",
    "core:window:allow-show",
    "core:window:allow-hide",
    "autostart:allow-enable",
    "autostart:allow-disable",
    "autostart:allow-is-enabled"
  ]
}
```

- [ ] **Step 2: Verify the build picks up permissions**

```bash
( cd src-tauri && cargo check )
```

Expected: no permission-schema errors.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/capabilities/default.json
git commit -m "chore: grant window and autostart capabilities"
```

---

## Task 15: Spike — verify the linchpin (cursor hit-test + click-through) on the real app

**Files:** none (manual verification of the open risk from the spec).

- [ ] **Step 1: Run the app**

```bash
npm run tauri dev
```

- [ ] **Step 2: Verify the ball falls and rests**

Expected: the ball drops from the top center, bounces with visibly decaying height, and comes to rest on the bottom edge without jitter.

- [ ] **Step 3: Verify the kick**

Click directly on the ball. Expected: it launches upward; clicking off-center adds sideways motion away from the click point.

- [ ] **Step 4: Verify click-through**

With the ball resting, click on an application window behind the overlay (not on the ball). Expected: the click reaches the app behind. Then click the ball — expected: it kicks. This confirms `cursor_position()` works while `ignore_cursor_events` is on (the documented open risk).

- [ ] **Step 5: Verify side/top/bottom bounces**

Kick the ball hard toward each wall. Expected: it bounces off left, right, top, and bottom edges and stays on screen.

- [ ] **Step 6: If `cursor_position()` does not work while ignoring events**

Fallback: replace the global read in `cursor.rs` with the `device_query` crate (`cargo add device_query`) and use `DeviceState::get_mouse().coords` for the global physical cursor; keep the same `is_cursor_on_ball` math. Re-run Steps 1–5.

- [ ] **Step 7: Commit any fallback changes (only if Step 6 was needed)**

```bash
git add -A
git commit -m "fix: use device_query fallback for global cursor position"
```

---

## Task 16: Tray behavior verification + final pass

**Files:** none (manual).

- [ ] **Step 1: Verify tray menu**

Open the tray/menubar menu. Expected: "Hide ball", "Launch at login", "Quit" are present.

- [ ] **Step 2: Verify Show/Hide**

Click "Hide ball" → ball disappears, label flips to "Show ball". Click again → reappears.

- [ ] **Step 3: Verify autostart toggle**

Click "Launch at login" → checkbox toggles. Confirm the OS login-items registration changed (macOS: System Settings → General → Login Items; Windows: registry Run key).

- [ ] **Step 4: Verify Quit**

Click "Quit" → app exits, tray icon disappears.

- [ ] **Step 5: Run the full frontend test suite once more**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit (if any tweaks were made)**

```bash
git add -A
git commit -m "test: final verification pass"
```

---

## Notes for the implementer

- **Immutability:** all physics/ball functions return new objects; never mutate `BallState`. The only mutable holders are the loop's local bindings and the Rust `Mutex<BallPos>`.
- **No magic numbers:** every tunable lives in `src/constants.ts`. If a value feels wrong during the spike, tune it there.
- **Coordinate spaces:** the frontend works in CSS px relative to the window; Rust converts to global physical px using `outer_position()` + `scale_factor()` before hit-testing. Keep these conversions only in `cursor.rs`.
- **Primary monitor only:** multi-monitor is out of scope (see spec). The overlay sizes to the primary monitor at startup.

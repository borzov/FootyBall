# Football Tray — Design Spec

**Date:** 2026-06-15
**Status:** Approved (design phase)

## Summary

A lightweight cross-platform tray/menubar application. A soccer ball appears as
a transparent overlay on top of the desktop. Clicking the ball kicks it upward;
the ball falls under gravity and bounces off all four screen edges with energy
loss, eventually coming to rest on the "floor". Physics aims to feel as natural
as possible. Clicks anywhere except on the ball pass through to the applications
behind the overlay.

## Goals

- Lightweight binary (Tauri v2, Rust + webview).
- Cross-platform: macOS (menubar), Windows/Linux (tray).
- Natural bounce physics: gravity, restitution-based damping, rolling friction,
  rest/sleep when motion is negligible.
- Click-through everywhere except the ball.
- Minimal tray menu: Show/Hide ball, Launch at login, Quit.

## Non-Goals (v1)

- Multi-monitor support — v1 targets the **primary monitor** work area only.
- Reset-position menu item (explicitly dropped).
- Settings UI, themes, sound, multiple balls.
- Top-edge "open" behavior — the ball bounces off the top edge too, so it never
  flies off-screen.

## Architecture

Two layers within a single Tauri v2 app:

- **Rust (backend):** tray icon + menu, transparent always-on-top overlay
  window, global cursor polling loop for click-through toggling, autostart
  plugin integration.
- **Webview (frontend):** `<canvas>` rendering, physics simulation, click-to-kick
  handling.

Rationale: physics and rendering iterate faster in JS/Canvas with
`requestAnimationFrame`; native concerns (tray, transparent window, global
cursor, autostart) live in Rust.

## Components

### Overlay window

- Transparent, borderless (`decorations: false`), `always_on_top`,
  `skip_taskbar`, not focused by default.
- Size = primary monitor work area.
- `set_ignore_cursor_events(true)` by default → clicks pass through.

### Click-through hit-testing (key mechanism)

When `ignore_cursor_events` is on, the webview receives **no** mouse events, so
hit-testing must happen in the backend against the global cursor position:

1. Frontend sends the ball's current `(x, y, r)` to Rust every frame
   (throttled to ~30–60 Hz; cheap IPC).
2. Rust runs a ~60 Hz loop reading the **global** cursor position
   (`window.cursor_position()`) and compares it against the ball circle.
3. Cursor inside the ball → `set_ignore_cursor_events(false)` (window captures
   the click; webview gets `pointerdown` → kick). Otherwise → `true`.
4. Toggle only on state change to avoid redundant calls.

### Physics

- State: position `(x, y)`, velocity `(vx, vy)`, radius `r`.
- Integration: semi-implicit Euler with a **fixed timestep** accumulator —
  stable regardless of frame rate.
- Constant gravity `g`.
- Wall collisions on all four edges with restitution `e ≈ 0.75` (energy loss →
  decaying bounces).
- Horizontal rolling friction along the floor.
- Sleep threshold: when speed is low and the ball is on the floor, zero out the
  jitter so it rests cleanly.
- Click = upward impulse plus a horizontal component derived from the click
  offset from the ball center (natural directionality).
- Sprite spin/rotation proportional to `vx` for a realistic rolling look.

### Tray menu

- "Show/Hide ball" — toggles overlay visibility.
- "Launch at login" — checkbox, via `tauri-plugin-autostart`.
- "Quit" — exits the app.

## Data Flow

```
[frontend rAF loop]
  step physics (fixed dt) → render ball on canvas
  emit ball (x,y,r) to Rust  ──► [Rust cursor loop]
                                    read global cursor
                                    inside ball? → set_ignore_cursor_events(false/true)
[user click on ball] (only when cursor events enabled)
  pointerdown → compute impulse from offset → update ball velocity
```

## Error Handling & Edge Cases

- Cursor position unavailable → treat as "not over ball" (safe: keep
  click-through on).
- Resolution / monitor change → listen for the event, clamp the ball inside the
  new bounds.
- Autostart plugin failure → log and continue; do not crash the app.

## Testing

- Physics is implemented as **pure functions** (`step`, `collide`) with no DOM
  dependency → unit-tested with vitest, target ≥80% coverage.
- Window/tray/cursor behaviors → manual verification.

## File Organization

```
src/                      (frontend)
  physics.ts   — pure integration step + collisions (no DOM)
  ball.ts      — ball state + kick impulse
  renderer.ts  — draws the sprite on canvas
  loop.ts      — rAF + fixed timestep; wires physics→render; reports pos to Rust
  main.ts      — bootstrap
src-tauri/src/
  lib.rs       — app builder, commands
  tray.rs      — tray icon + menu
  overlay.rs   — overlay window setup
  cursor.rs    — global cursor polling + ignore-events toggle
```

## Open Risks

- `window.cursor_position()` availability and accuracy across all three
  platforms while the window ignores cursor events — verify early during
  implementation; it is the linchpin of the click-through behavior.

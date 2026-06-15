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

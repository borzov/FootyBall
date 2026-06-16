// Ball-selection state: persisted in the webview (localStorage) and kept in sync
// with the native tray submenu. The tray emits `ball-changed` when the user
// picks a design; on startup we tell the tray which design is active so its
// checkmark matches the persisted choice.
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { DEFAULT_BALL, getSkin, isBallId, type BallId, type Skin } from './skins'

const STORAGE_KEY = 'footyball:ball'

function load(): BallId {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return isBallId(v) ? v : DEFAULT_BALL
  } catch {
    return DEFAULT_BALL
  }
}

function save(id: BallId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // private mode / storage disabled — selection just won't persist
  }
}

let current: BallId = load()

// Live accessor for the renderer — returns the skin of the active ball.
export function currentSkin(): Skin {
  return getSkin(current)
}

// Wires the tray <-> webview sync. Best-effort: silently no-ops outside Tauri.
export function initBallSelection(): void {
  // Sync the tray checkmark to the persisted selection.
  void invoke('sync_ball_menu', { id: current }).catch(() => {})

  void listen<string>('ball-changed', (event) => {
    if (isBallId(event.payload)) {
      current = event.payload
      save(current)
    }
  }).catch(() => {})
}

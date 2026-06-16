// Ball "skins": flat vector designs the canvas spins and shades at runtime.
// Each SVG is the design with NO sphere shading baked in — the renderer adds a
// fixed highlight + rim darkening so lighting stays put while the ball rolls.
import classic from './balls/classic.svg?raw'
import trionda from './balls/trionda.svg?raw'
import retro from './balls/retro.svg?raw'
import redsport from './balls/redsport.svg?raw'
import neon from './balls/neon.svg?raw'
import gold from './balls/gold.svg?raw'

// Order here is the order shown in the tray submenu.
export const BALL_IDS = [
  'classic',
  'trionda',
  'retro',
  'redsport',
  'neon',
  'gold',
] as const

export type BallId = (typeof BALL_IDS)[number]

export const DEFAULT_BALL: BallId = 'classic'

export function isBallId(value: unknown): value is BallId {
  return typeof value === 'string' && (BALL_IDS as readonly string[]).includes(value)
}

export interface Skin {
  readonly id: BallId
  readonly img: HTMLImageElement
  loaded: boolean
}

const RAW: Record<BallId, string> = { classic, trionda, retro, redsport, neon, gold }

function loadSkin(id: BallId): Skin {
  const img = new Image()
  const skin: Skin = { id, img, loaded: false }
  img.onload = () => { skin.loaded = true }
  // SVG data URL — no network, decodes near-instantly.
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(RAW[id])
  // decode() flips `loaded` slightly sooner where supported; onload is the
  // guaranteed fallback (and the renderer falls back to a drawn ball meanwhile).
  void img.decode?.().then(() => { skin.loaded = true }).catch(() => {})
  return skin
}

const SKINS: Record<BallId, Skin> = Object.fromEntries(
  BALL_IDS.map((id) => [id, loadSkin(id)]),
) as Record<BallId, Skin>

export function getSkin(id: BallId): Skin {
  return SKINS[id]
}

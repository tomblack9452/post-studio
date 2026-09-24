import { mulberry32 } from './rng'

// Loaded images are cached by src, so thumbnails and the main preview share them.
const cache = new Map()

export const PLACEHOLDER_PREFIX = 'placeholder:'

export function loadSlideImage(src) {
  if (!src) return Promise.resolve(null)
  if (!cache.has(src)) {
    const p = src.startsWith(PLACEHOLDER_PREFIX)
      ? Promise.resolve(makePlaceholder(Number(src.slice(PLACEHOLDER_PREFIX.length)) || 1))
      : loadImage(src).catch(() => new Promise((r) => setTimeout(r, 1200)).then(() => loadImage(src))) // one retry for brief throttling
    p.catch(() => cache.delete(src))
    cache.set(src, p)
  }
  return cache.get(src)
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (/^https?:/.test(src)) img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image failed to load (it may be too large or unavailable). Pick another.'))
    img.src = src
  })
}

/** Procedural night scene used until a real image is picked. */
function makePlaceholder(seed) {
  const w = 1400
  const h = 1600
  const rnd = mulberry32(seed * 7919)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')

  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, `hsl(${200 + rnd() * 40}, 30%, 14%)`)
  sky.addColorStop(0.6, `hsl(${190 + rnd() * 30}, 25%, 22%)`)
  sky.addColorStop(1, '#050607')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.8})`
    const r = rnd() * 1.8 + 0.3
    ctx.beginPath()
    ctx.arc(rnd() * w, rnd() * h * 0.65, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // a distant light source
  const gx = w * (0.2 + rnd() * 0.6)
  const gy = h * (0.2 + rnd() * 0.3)
  const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, 320)
  glow.addColorStop(0, 'rgba(220,240,255,0.55)')
  glow.addColorStop(0.15, 'rgba(160,200,230,0.2)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)

  // fog band
  for (let i = 0; i < 10; i++) {
    const fy = h * (0.55 + rnd() * 0.2)
    const fog = ctx.createRadialGradient(rnd() * w, fy, 0, rnd() * w, fy, 400 + rnd() * 300)
    fog.addColorStop(0, 'rgba(200,210,220,0.12)')
    fog.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = fog
    ctx.fillRect(0, 0, w, h)
  }

  // treeline silhouette
  ctx.fillStyle = '#030404'
  ctx.beginPath()
  ctx.moveTo(0, h)
  let x = 0
  const base = h * 0.74
  while (x < w) {
    const tw = 30 + rnd() * 60
    const th = 80 + rnd() * 260
    ctx.lineTo(x, base)
    ctx.lineTo(x + tw / 2, base - th)
    ctx.lineTo(x + tw, base)
    x += tw * (0.5 + rnd() * 0.5)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(0, base, w, h - base)

  return c
}

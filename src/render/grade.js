import { mulberry32 } from './rng'

// Graded photos are cached so typing in the editor doesn't redo pixel work.
const cache = new Map()
const CACHE_MAX = 48
const imageIds = new WeakMap()
let nextImageId = 1

function imageKey(img) {
  if (!imageIds.has(img)) imageIds.set(img, nextImageId++)
  return imageIds.get(img)
}

/**
 * Returns a canvas of size w x h containing `img` cover-fitted,
 * desaturated, contrast-graded, tinted and vignetted.
 * crop: { focusX, focusY, zoom } - focus 0..1 picks which part of the image stays in frame.
 * grade: BRAND.grade merged with the post style's overrides, plus shadowTint [r, g, b].
 */
export function gradedPhoto(img, w, h, crop = {}, grade) {
  const fx = crop.focusX ?? 0.5
  const fy = crop.focusY ?? 0.5
  const zoom = crop.zoom ?? 1
  const key = `${imageKey(img)}|${w}x${h}|${fx}|${fy}|${zoom}|${JSON.stringify(grade)}`
  const hit = cache.get(key)
  if (hit) return hit

  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })

  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  const scale = Math.max(w / iw, h / ih) * zoom
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(img, (w - dw) * fx, (h - dh) * fy, dw, dh)

  try {
    const data = ctx.getImageData(0, 0, w, h)
    colourGrade(data.data, grade)
    if (grade.rgbShift) rgbShift(data, grade.rgbShift)
    ctx.putImageData(data, 0, 0)
  } catch {
    // Canvas is tainted (cross-origin image without CORS). Fall back to CSS filters.
    const g = grade
    const tmp = document.createElement('canvas')
    tmp.width = w
    tmp.height = h
    const t = tmp.getContext('2d')
    t.filter = `saturate(${g.saturation}) contrast(${g.contrast}) brightness(${g.brightness})`
    t.drawImage(c, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(tmp, 0, 0)
  }

  drawVignette(ctx, w, h, grade.vignette)

  cache.set(key, c)
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value)
  return c
}

function colourGrade(px, grade) {
  const { saturation, contrast, brightness, blackLift, shadowTint, tintStrength } = grade
  const [tr, tg, tb] = shadowTint
  const lift = blackLift / 255
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i] / 255
    let g = px[i + 1] / 255
    let b = px[i + 2] / 255
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b

    // desaturate
    r = l + (r - l) * saturation
    g = l + (g - l) * saturation
    b = l + (b - l) * saturation

    // contrast around mid-grey, then darken
    r = ((r - 0.5) * contrast + 0.5) * brightness
    g = ((g - 0.5) * contrast + 0.5) * brightness
    b = ((b - 0.5) * contrast + 0.5) * brightness

    // lifted blacks (faded film)
    r = lift + r * (1 - lift)
    g = lift + g * (1 - lift)
    b = lift + b * (1 - lift)

    // tint the shadows only
    const t = (1 - l) * (1 - l) * tintStrength
    px[i] = (r * (1 - t) + (tr / 255) * t) * 255
    px[i + 1] = (g * (1 - t) + (tg / 255) * t) * 255
    px[i + 2] = (b * (1 - t) + (tb / 255) * t) * 255
  }
}

// Camcorder colour bleed: red pulled left, blue pushed right.
function rgbShift({ data, width, height }, shift) {
  const src = new Uint8ClampedArray(data)
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      const i = (row + x) * 4
      data[i] = src[(row + Math.min(width - 1, x + shift)) * 4]
      data[i + 2] = src[(row + Math.max(0, x - shift)) * 4 + 2]
    }
  }
}

function drawVignette(ctx, w, h, strength) {
  const r = Math.hypot(w, h) / 2
  const grad = ctx.createRadialGradient(w / 2, h * 0.45, r * 0.3, w / 2, h * 0.45, r)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.6, `rgba(0,0,0,${strength * 0.45})`)
  grad.addColorStop(1, `rgba(0,0,0,${strength})`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

let grainTile = null
function getGrainTile() {
  if (grainTile) return grainTile
  const size = 256
  grainTile = document.createElement('canvas')
  grainTile.width = grainTile.height = size
  const ctx = grainTile.getContext('2d')
  const img = ctx.createImageData(size, size)
  const rnd = mulberry32(1977)
  for (let i = 0; i < img.data.length; i += 4) {
    // roughly gaussian noise centred on mid-grey (neutral for overlay)
    const v = 128 + ((rnd() + rnd() + rnd()) / 3 - 0.5) * 360
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return grainTile
}

export function applyGrain(ctx, w, h, amount) {
  if (!amount) return
  ctx.save()
  ctx.globalAlpha = amount
  ctx.globalCompositeOperation = 'overlay'
  ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat')
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

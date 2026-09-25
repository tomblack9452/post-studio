import { BRAND } from '../config/brand'
import { getDesign } from '../config/styles'
import { hexToRgb, rgba, themeColours } from '../config/themes'
import { applyGrain, gradedPhoto } from './grade'
import { drawSpaced, drawTokenLines, measureSpaced, tokenize, wrapTokens } from './text'

const W = BRAND.width
const H = BRAND.height
const M = BRAND.margin
const TEXT_WIDTH = W - M * 2
const TEXT_BOTTOM = H - 150 // leaves room for the footer row
const FOOTER_Y = H - 76
const SPLIT_PHOTO_H = Math.round(H * 0.58)

// Starting font sizes (for Anton / Inter); fonts scale them, then the block shrinks until it fits.
const SIZES = {
  hook: { headline: 132, body: 38 },
  story: { headline: 84, body: 46 },
  question: { headline: 116, body: 38 },
}

const FLAG_LABELS = { disputed: 'DISPUTED', unverified: 'UNVERIFIED', theory: 'THEORY' }

const FALLBACKS = {
  Anton: 'Impact, sans-serif',
  'Playfair Display': 'Georgia, serif',
  Lora: 'Georgia, serif',
  Cinzel: 'Georgia, serif',
  'EB Garamond': 'Georgia, serif',
  Caveat: 'cursive',
  'Special Elite': '"Courier New", monospace',
  'Courier Prime': '"Courier New", monospace',
  VT323: '"Courier New", monospace',
}
const font = (f, size, weight = f.weight) =>
  `${weight} ${Math.round(size)}px "${f.family}", ${FALLBACKS[f.family] || 'system-ui, sans-serif'}`

// Fixed fonts for overlay text, so a variation keeps its look whatever font the post uses.
const OVERLAY_FONTS = {
  mono: { family: 'Courier Prime', weight: 700 },
  pixel: { family: 'VT323', weight: 400 },
  serif: { family: 'Lora', weight: 600 },
  hand: { family: 'Caveat', weight: 700 },
}

/**
 * Draws one slide onto a 1080x1350 canvas.
 * settings: { theme, handle }. design: { style, variation, font } ids (see config/styles.js).
 * image: a loaded HTMLImageElement / canvas, or null.
 */
export function renderSlide(canvas, { slide, index, total, settings, image, design }) {
  const ctx = canvas.getContext('2d')
  const { ids, variation, font: fonts } = getDesign(design)
  const theme = themeColours(settings.theme)
  const look = {
    fonts,
    variation,
    theme,
    accent: theme.accent,
    text: theme.text,
    textSoft: rgba(theme.text, 0.9),
    muted: rgba(theme.text, 0.55),
  }
  const grade = {
    ...BRAND.grade,
    ...variation.grade,
    shadowTint: hexToRgb(theme.tint),
    mono: variation.grade.mono ? hexToRgb(variation.grade.mono) : null,
  }
  const photo = (w, h) => (image ? gradedPhoto(image, w, h, slide.image || {}, grade) : null)
  const overlay = OVERLAYS[ids.variation]

  ctx.save()
  ctx.textBaseline = 'top'
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, W, H)

  // The layout draws the photo and returns the box the text goes in.
  const box = LAYOUTS[ids.style](ctx, { slide, index, photo, look })
  if (overlay?.top) drawTopScrim(ctx, theme.bg)

  const block = fitBlock(ctx, slide, box.bottom - box.top, fonts)
  const y = box.anchor === 'bottom' ? box.bottom - block.height : box.top
  drawBlock(ctx, block, y, look)

  drawFooter(ctx, { isLast: index >= total - 1, handle: settings.handle, look })
  overlay?.draw(ctx, { index, total, look })
  applyGrain(ctx, W, H, grade.grain)
  overlay?.after?.(ctx, look)
  ctx.restore()
}

// ------------------------------------------------------------------ layouts (post styles)

const LAYOUTS = {
  // Photo fills the slide (or the top 58% on Split slides), text over the fade.
  classic(ctx, { slide, photo, look }) {
    const split = slide.layout === 'split'
    const photoH = split ? SPLIT_PHOTO_H : H
    const p = photo(W, photoH)
    if (p) ctx.drawImage(p, 0, 0)
    drawScrim(ctx, split, photoH, look.theme.bg)
    return split
      ? { top: photoH - 24, bottom: TEXT_BOTTOM, anchor: 'top' }
      : { top: Math.round(H * 0.4), bottom: TEXT_BOTTOM, anchor: 'bottom' }
  },

  // Headline at the top over a dark band; the photo rises from the bottom.
  poster(ctx, { photo, look }) {
    const p = photo(W, H)
    if (p) ctx.drawImage(p, 0, 0)
    const c = (a) => rgba(look.theme.bg, a)
    const top = ctx.createLinearGradient(0, 0, 0, H * 0.7)
    top.addColorStop(0, c(1))
    top.addColorStop(0.45, c(0.93))
    top.addColorStop(1, c(0))
    ctx.fillStyle = top
    ctx.fillRect(0, 0, W, H * 0.7)
    const bottom = ctx.createLinearGradient(0, H - 320, 0, H)
    bottom.addColorStop(0, c(0))
    bottom.addColorStop(1, c(0.92))
    ctx.fillStyle = bottom
    ctx.fillRect(0, H - 320, W, 320)
    return { top: 150, bottom: Math.round(H * 0.6), anchor: 'top' }
  },

  // A bordered print with a "FIG." caption, text underneath.
  framed(ctx, { slide, index, photo, look }) {
    const x = M
    const y = 150
    const w = W - M * 2
    const h = 560
    ctx.fillStyle = rgba(look.text, 0.05)
    ctx.fillRect(x - 16, y - 16, w + 32, h + 32)
    ctx.strokeStyle = rgba(look.text, 0.3)
    ctx.lineWidth = 2
    ctx.strokeRect(x - 16, y - 16, w + 32, h + 32)
    const p = photo(w, h)
    if (p) ctx.drawImage(p, x, y)
    ctx.strokeStyle = rgba(look.text, 0.45)
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)

    const title = slide.image?.provider !== 'placeholder' ? slide.image?.title || '' : ''
    ctx.font = font(OVERLAY_FONTS.mono, 20)
    ctx.fillStyle = look.muted
    drawSpaced(ctx, fitText(ctx, `FIG. ${index + 1}${title ? ` · ${title.toUpperCase()}` : ''}`, w, 2), x, y + h + 34, 2)
    return { top: y + h + 100, bottom: TEXT_BOTTOM, anchor: 'top' }
  },

  // A taped instant photo, tilted, like evidence pinned to a board.
  polaroid(ctx, { index, photo }) {
    const pw = 640
    const ph = 500
    const side = 24
    const foot = 96
    const fw = pw + side * 2
    const fh = ph + side + foot
    const top = 104

    ctx.save()
    ctx.translate(W / 2, top + fh / 2)
    ctx.rotate(-0.04)
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = 36
    ctx.shadowOffsetY = 14
    ctx.fillStyle = '#efe9dc'
    ctx.fillRect(-fw / 2, -fh / 2, fw, fh)
    ctx.shadowColor = 'transparent'
    const p = photo(pw, ph)
    ctx.fillStyle = '#1a1816'
    if (p) ctx.drawImage(p, -fw / 2 + side, -fh / 2 + side)
    else ctx.fillRect(-fw / 2 + side, -fh / 2 + side, pw, ph)

    ctx.font = font(OVERLAY_FONTS.hand, 48)
    ctx.fillStyle = '#2b2622'
    ctx.fillText(`Exhibit ${index + 1}`, -fw / 2 + side + 8, fh / 2 - foot + 20)

    drawTape(ctx, -fw / 2 + 50, -fh / 2 - 6, -0.55)
    drawTape(ctx, fw / 2 - 50, -fh / 2 - 6, 0.55)
    ctx.restore()
    return { top: top + fh + 60, bottom: TEXT_BOTTOM, anchor: 'top' }
  },

  // The photo seen through a round lens with a graduated ring.
  lens(ctx, { photo, look }) {
    const r = 290
    const cx = W / 2
    const cy = 130 + r

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    const p = photo(r * 2, r * 2)
    if (p) ctx.drawImage(p, cx - r, cy - r)
    const inner = ctx.createRadialGradient(cx, cy, r * 0.65, cx, cy, r)
    inner.addColorStop(0, 'rgba(0,0,0,0)')
    inner.addColorStop(1, 'rgba(0,0,0,0.6)')
    ctx.fillStyle = inner
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    ctx.restore()

    ctx.lineWidth = 4
    ctx.strokeStyle = look.accent
    ctx.beginPath()
    ctx.arc(cx, cy, r + 12, 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = rgba(look.text, 0.22)
    ctx.beginPath()
    ctx.arc(cx, cy, r + 30, 0, Math.PI * 2)
    ctx.stroke()
    for (let deg = 0; deg < 360; deg += 5) {
      const long = deg % 30 === 0
      const a = (deg * Math.PI) / 180
      const r1 = r + 38
      const r2 = r1 + (long ? 16 : 7)
      ctx.strokeStyle = rgba(look.text, long ? 0.5 : 0.25)
      ctx.lineWidth = long ? 2 : 1
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2)
      ctx.stroke()
    }
    return { top: cy + r + 96, bottom: TEXT_BOTTOM, anchor: 'top' }
  },
}

function drawScrim(ctx, split, photoH, bg) {
  const c = (a) => rgba(bg, a)
  if (split) {
    const grad = ctx.createLinearGradient(0, photoH * 0.5, 0, photoH)
    grad.addColorStop(0, c(0))
    grad.addColorStop(0.7, c(0.75))
    grad.addColorStop(1, c(1))
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, photoH)
    ctx.fillStyle = bg
    ctx.fillRect(0, photoH, W, H - photoH)
  } else {
    const grad = ctx.createLinearGradient(0, H * 0.28, 0, H)
    grad.addColorStop(0, c(0))
    grad.addColorStop(0.4, c(0.55))
    grad.addColorStop(0.7, c(0.9))
    grad.addColorStop(1, c(0.97))
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
  }
}

// Keeps labels drawn along the top edge readable over bright photos.
function drawTopScrim(ctx, bg) {
  const grad = ctx.createLinearGradient(0, 0, 0, 240)
  grad.addColorStop(0, rgba(bg, 0.8))
  grad.addColorStop(1, rgba(bg, 0))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, 240)
}

function drawTape(ctx, x, y, angle) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = 'rgba(230, 220, 192, 0.6)'
  ctx.fillRect(-62, -18, 124, 36)
  ctx.restore()
}

/** Shortens text with an ellipsis until it fits maxWidth (letter-spaced). */
function fitText(ctx, text, maxWidth, spacing) {
  if (measureSpaced(ctx, text, spacing) <= maxWidth) return text
  let t = text
  while (t.length > 1 && measureSpaced(ctx, `${t}…`, spacing) > maxWidth) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

// ------------------------------------------------------------------ text block

/** Lays out chip / kicker / headline / body, shrinking until it fits maxHeight. */
function fitBlock(ctx, slide, maxHeight, fonts) {
  const base = SIZES[slide.type] || SIZES.story
  const rawHeadline = (slide.headline || '').trim()
  const headline = fonts.display.uppercase ? rawHeadline.toUpperCase() : rawHeadline
  const body = (slide.body || '').trim()
  let block
  for (let s = 1; s >= 0.5; s -= 0.03) {
    const hSize = base.headline * fonts.display.scale * s
    const bSize = base.body * fonts.body.scale * s
    block = measureBlock(ctx, slide, headline, body, hSize, bSize, fonts)
    if (block.height <= maxHeight && !block.overflow) break
  }
  return block
}

function measureBlock(ctx, slide, headline, body, hSize, bSize, fonts) {
  const parts = []
  let overflow = false
  const ls = fonts.label.scale

  if (FLAG_LABELS[slide.flag]) {
    parts.push({ kind: 'chip', text: FLAG_LABELS[slide.flag], h: Math.round(44 * ls), gap: 22 })
  }
  if (slide.kicker?.trim()) {
    parts.push({ kind: 'kicker', text: slide.kicker.trim().toUpperCase(), h: Math.round(30 * ls), gap: 26 })
  }

  if (headline) {
    ctx.font = font(fonts.display, hSize)
    const wrapped = wrapTokens(ctx, tokenize(headline), TEXT_WIDTH)
    overflow ||= wrapped.overflow
    const lh = Math.round(hSize * fonts.display.lineHeight)
    parts.push({ kind: 'headline', wrapped, size: hSize, lh, h: wrapped.lines.length * lh, gap: Math.round(hSize * 0.3) })
  }
  if (body) {
    ctx.font = font(fonts.body, bSize)
    const wrapped = wrapTokens(ctx, tokenize(body), TEXT_WIDTH)
    overflow ||= wrapped.overflow
    const lh = Math.round(bSize * fonts.body.lineHeight)
    parts.push({ kind: 'body', wrapped, size: bSize, lh, h: wrapped.lines.length * lh, gap: 0 })
  }

  const height = parts.reduce((sum, p, i) => sum + p.h + (i < parts.length - 1 ? p.gap : 0), 0)
  return { parts, height, overflow }
}

function drawBlock(ctx, block, y, look) {
  const { fonts, variation } = look
  for (const p of block.parts) {
    if (p.kind === 'chip') (variation.stamp ? drawStamp : drawChip)(ctx, p.text, M, y, look)
    if (p.kind === 'kicker') drawKicker(ctx, p.text, M, y, look)
    if (p.kind === 'headline') {
      ctx.font = font(fonts.display, p.size)
      if (fonts.display.glow) {
        ctx.shadowColor = rgba(look.accent, 0.5)
        ctx.shadowBlur = 18
      }
      drawTokenLines(ctx, p.wrapped, M, y, p.lh, look.text, look.accent)
      ctx.shadowBlur = 0
    }
    if (p.kind === 'body') {
      ctx.font = font(fonts.body, p.size)
      drawTokenLines(ctx, p.wrapped, M, y, p.lh, look.textSoft, look.accent)
    }
    y += p.h + p.gap
  }
}

function drawChip(ctx, text, x, y, { fonts, accent }) {
  const ls = fonts.label.scale
  ctx.font = font(fonts.label, 20 * ls, 700)
  const spacing = 4
  const tw = measureSpaced(ctx, text, spacing)
  const padX = 16
  const h = 42 * ls
  ctx.strokeStyle = accent
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(x + 1, y + 1, tw + padX * 2, h, 4)
  ctx.stroke()
  ctx.fillStyle = accent
  drawSpaced(ctx, text, x + padX, y + (h - 20 * ls) / 2 + 1, spacing)
}

// Case file: flags look like a rubber stamp.
function drawStamp(ctx, text, x, y, { accent }) {
  ctx.save()
  ctx.font = font(OVERLAY_FONTS.mono, 24)
  const spacing = 5
  const tw = measureSpaced(ctx, text, spacing)
  const w = tw + 36
  const h = 46
  ctx.translate(x + w / 2, y + h / 2)
  ctx.rotate(-0.06)
  ctx.globalAlpha = 0.9
  ctx.strokeStyle = accent
  ctx.lineWidth = 4
  ctx.strokeRect(-w / 2, -h / 2, w, h)
  ctx.lineWidth = 1.5
  ctx.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10)
  ctx.fillStyle = accent
  drawSpaced(ctx, text, -tw / 2, -12, spacing)
  ctx.restore()
}

function drawKicker(ctx, text, x, y, { fonts, accent }) {
  const ls = fonts.label.scale
  ctx.fillStyle = accent
  ctx.fillRect(x, y + Math.round(12 * ls), 36, 4)
  ctx.font = font(fonts.label, 24 * ls)
  drawSpaced(ctx, text, x + 52, y + 2, fonts.label.spacing)
}

function drawFooter(ctx, { isLast, handle, look }) {
  const { fonts, accent, text, muted } = look
  const ls = fonts.label.scale
  ctx.font = font(fonts.label, 22 * ls, Math.min(fonts.label.weight, 600))
  const spacing = fonts.label.spacing + 0.5

  if (!isLast) {
    ctx.fillStyle = muted
    const end = drawSpaced(ctx, 'SWIPE', M, FOOTER_Y, spacing)
    // arrow drawn as lines so it never depends on a glyph
    const ax = end + 18
    const ay = FOOTER_Y + Math.round(11 * ls)
    ctx.strokeStyle = accent
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(ax + 34, ay)
    ctx.moveTo(ax + 24, ay - 8)
    ctx.lineTo(ax + 34, ay)
    ctx.lineTo(ax + 24, ay + 8)
    ctx.stroke()
  }

  if (handle) {
    ctx.font = font(fonts.label, 24 * ls, Math.min(fonts.label.weight, 600))
    ctx.fillStyle = rgba(text, 0.7)
    const w = measureSpaced(ctx, handle, 1.5)
    drawSpaced(ctx, handle, W - M - w, FOOTER_Y - 1, 1.5)
  }
}

// ------------------------------------------------------------------ overlays (variations)

const pad2 = (n) => String(n).padStart(2, '0')

function drawRight(ctx, text, y, spacing) {
  drawSpaced(ctx, text, W - M - measureSpaced(ctx, text, spacing), y, spacing)
}

function scanlines(ctx, alpha) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1)
}

const OVERLAYS = {
  caseFile: {
    top: true,
    draw(ctx, { index, total, look }) {
      ctx.strokeStyle = rgba(look.text, 0.28)
      ctx.lineWidth = 2
      ctx.strokeRect(36, 36, W - 72, H - 72)

      ctx.font = font(OVERLAY_FONTS.mono, 22)
      ctx.fillStyle = look.muted
      drawSpaced(ctx, `FILE ${pad2(index + 1)} / ${pad2(total)}`, M, 70, 4)
      ctx.fillStyle = look.accent
      drawRight(ctx, 'EVIDENCE', 70, 4)
    },
  },

  camcorder: {
    top: true,
    draw(ctx, { index, look }) {
      ctx.font = font(OVERLAY_FONTS.pixel, 46)
      ctx.fillStyle = look.accent
      ctx.beginPath()
      ctx.arc(M + 12, 86, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = look.text
      drawSpaced(ctx, 'REC', M + 36, 68, 3)
      // A made-up but steady tape counter, so every slide looks like a later moment on the tape.
      drawRight(ctx, `0:${pad2(index * 7 + 2)}:${pad2((index * 37 + 11) % 60)}`, 68, 3)
    },
    after: (ctx) => scanlines(ctx, 0.16),
  },

  ghostCam: {
    top: true,
    draw(ctx, { index, look }) {
      // viewfinder corners, outside the footer text
      const inset = 34
      const len = 80
      ctx.strokeStyle = rgba(look.text, 0.75)
      ctx.lineWidth = 4
      ctx.lineCap = 'square'
      ctx.beginPath()
      for (const [x, y, dx, dy] of [
        [inset, inset, 1, 1],
        [W - inset, inset, -1, 1],
        [inset, H - inset, 1, -1],
        [W - inset, H - inset, -1, -1],
      ]) {
        ctx.moveTo(x, y + dy * len)
        ctx.lineTo(x, y)
        ctx.lineTo(x + dx * len, y)
      }
      ctx.stroke()

      ctx.font = font(OVERLAY_FONTS.pixel, 42)
      ctx.fillStyle = look.accent
      ctx.beginPath()
      ctx.arc(M + 22, 98, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = look.text
      drawSpaced(ctx, 'IR  CAM 02', M + 42, 82, 3)
      // Always the small hours: a steady fake clock that moves on with each slide.
      drawSpaced(
        ctx,
        `03:${pad2(13 + ((index * 4) % 46))}:${pad2((index * 29 + 7) % 60)} AM`,
        W - M - 12 - measureSpaced(ctx, '03:00:00 AM', 3),
        82,
        3,
      )
    },
    after: (ctx) => scanlines(ctx, 0.1),
  },

  newspaper: {
    top: true,
    draw(ctx, { index, look }) {
      ctx.fillStyle = rgba(look.text, 0.75)
      ctx.fillRect(M, 58, W - M * 2, 3)
      ctx.fillRect(M, 66, W - M * 2, 1)
      ctx.font = font(OVERLAY_FONTS.serif, 21)
      ctx.fillStyle = look.muted
      drawSpaced(ctx, `NO. ${index + 1}`, M, 82, 3)
      ctx.fillStyle = look.accent
      drawRight(ctx, 'EXTRA', 82, 3)
    },
  },

  filmStrip: {
    top: true,
    draw(ctx, { index, look }) {
      const band = 64
      ctx.fillStyle = 'rgba(8,8,8,0.9)'
      ctx.fillRect(0, 0, band, H)
      ctx.fillRect(W - band, 0, band, H)
      ctx.fillStyle = 'rgba(236,232,225,0.82)'
      for (let y = 26; y < H - 30; y += 72) {
        for (const x of [20, W - band + 20]) {
          ctx.beginPath()
          ctx.roundRect(x, y, 24, 40, 5)
          ctx.fill()
        }
      }
      ctx.font = font(OVERLAY_FONTS.mono, 22)
      ctx.fillStyle = look.accent
      drawSpaced(ctx, `▸ ${index + 1}A`, M, 70, 3)
      ctx.fillStyle = look.muted
      drawRight(ctx, 'SAFETY FILM', 70, 3)
    },
  },
}

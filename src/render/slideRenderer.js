import { BRAND } from '../config/brand'
import { getStyle } from '../config/styles'
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

// Starting font sizes (for Anton / Inter); styles scale them, then the block shrinks until it fits.
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
  'Special Elite': '"Courier New", monospace',
  'Courier Prime': '"Courier New", monospace',
  VT323: '"Courier New", monospace',
}
const font = (f, size, weight = f.weight) =>
  `${weight} ${Math.round(size)}px "${f.family}", ${FALLBACKS[f.family] || 'system-ui, sans-serif'}`

/**
 * Draws one slide onto a 1080x1350 canvas.
 * settings: { theme, handle }. style: post style id (see config/styles.js).
 * image: a loaded HTMLImageElement / canvas, or null.
 */
export function renderSlide(canvas, { slide, index, total, settings, image, style: styleId }) {
  const ctx = canvas.getContext('2d')
  const style = getStyle(styleId)
  const theme = themeColours(settings.theme)
  const look = {
    style,
    theme,
    accent: theme.accent,
    text: theme.text,
    textSoft: rgba(theme.text, 0.9),
    muted: rgba(theme.text, 0.55),
  }
  const grade = { ...BRAND.grade, ...style.grade, shadowTint: hexToRgb(theme.tint) }
  const decor = DECOR[style.decor]
  const split = slide.layout === 'split'
  const photoH = split ? SPLIT_PHOTO_H : H

  ctx.save()
  ctx.textBaseline = 'top'
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, W, H)

  if (image) ctx.drawImage(gradedPhoto(image, W, photoH, slide.image || {}, grade), 0, 0)
  drawScrim(ctx, split, photoH, theme.bg)
  if (decor?.top) drawTopScrim(ctx, theme.bg)

  // Split: text starts at a fixed line under the photo on every slide.
  // Full: text sits on the bottom edge.
  const boxTop = split ? photoH - 24 : Math.round(H * 0.4)
  const block = fitBlock(ctx, slide, TEXT_BOTTOM - boxTop, style)
  const y = split ? boxTop : TEXT_BOTTOM - block.height
  drawBlock(ctx, block, y, look)

  drawFooter(ctx, { isLast: index >= total - 1, handle: settings.handle, look })
  decor?.draw(ctx, { index, total, look })
  applyGrain(ctx, W, H, grade.grain)
  decor?.after?.(ctx, look)
  ctx.restore()
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

/** Lays out chip / kicker / headline / body, shrinking until it fits maxHeight. */
function fitBlock(ctx, slide, maxHeight, style) {
  const base = SIZES[slide.type] || SIZES.story
  const rawHeadline = (slide.headline || '').trim()
  const headline = style.display.uppercase ? rawHeadline.toUpperCase() : rawHeadline
  const body = (slide.body || '').trim()
  let block
  for (let s = 1; s >= 0.5; s -= 0.03) {
    const hSize = base.headline * style.display.scale * s
    const bSize = base.body * style.body.scale * s
    block = measureBlock(ctx, slide, headline, body, hSize, bSize, style)
    if (block.height <= maxHeight && !block.overflow) break
  }
  return block
}

function measureBlock(ctx, slide, headline, body, hSize, bSize, style) {
  const parts = []
  let overflow = false
  const ls = style.label.scale

  if (FLAG_LABELS[slide.flag]) {
    parts.push({ kind: 'chip', text: FLAG_LABELS[slide.flag], h: Math.round(44 * ls), gap: 22 })
  }
  if (slide.kicker?.trim()) {
    parts.push({ kind: 'kicker', text: slide.kicker.trim().toUpperCase(), h: Math.round(30 * ls), gap: 26 })
  }

  if (headline) {
    ctx.font = font(style.display, hSize)
    const wrapped = wrapTokens(ctx, tokenize(headline), TEXT_WIDTH)
    overflow ||= wrapped.overflow
    const lh = Math.round(hSize * style.display.lineHeight)
    parts.push({ kind: 'headline', wrapped, size: hSize, lh, h: wrapped.lines.length * lh, gap: Math.round(hSize * 0.3) })
  }
  if (body) {
    ctx.font = font(style.body, bSize)
    const wrapped = wrapTokens(ctx, tokenize(body), TEXT_WIDTH)
    overflow ||= wrapped.overflow
    const lh = Math.round(bSize * style.body.lineHeight)
    parts.push({ kind: 'body', wrapped, size: bSize, lh, h: wrapped.lines.length * lh, gap: 0 })
  }

  const height = parts.reduce((sum, p, i) => sum + p.h + (i < parts.length - 1 ? p.gap : 0), 0)
  return { parts, height, overflow }
}

function drawBlock(ctx, block, y, look) {
  const { style } = look
  for (const p of block.parts) {
    if (p.kind === 'chip') (style.decor === 'caseFile' ? drawStamp : drawChip)(ctx, p.text, M, y, look)
    if (p.kind === 'kicker') drawKicker(ctx, p.text, M, y, look)
    if (p.kind === 'headline') {
      ctx.font = font(style.display, p.size)
      if (style.display.glow) {
        ctx.shadowColor = rgba(look.accent, 0.5)
        ctx.shadowBlur = 18
      }
      drawTokenLines(ctx, p.wrapped, M, y, p.lh, look.text, look.accent)
      ctx.shadowBlur = 0
    }
    if (p.kind === 'body') {
      ctx.font = font(style.body, p.size)
      drawTokenLines(ctx, p.wrapped, M, y, p.lh, look.textSoft, look.accent)
    }
    y += p.h + p.gap
  }
}

function drawChip(ctx, text, x, y, { style, accent }) {
  const ls = style.label.scale
  ctx.font = font(style.label, 20 * ls, 700)
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
function drawStamp(ctx, text, x, y, { style, accent }) {
  ctx.save()
  ctx.font = font(style.label, 24, 700)
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

function drawKicker(ctx, text, x, y, { style, accent }) {
  const ls = style.label.scale
  ctx.fillStyle = accent
  ctx.fillRect(x, y + Math.round(12 * ls), 36, 4)
  ctx.font = font(style.label, 24 * ls)
  drawSpaced(ctx, text, x + 52, y + 2, style.label.spacing)
}

function drawFooter(ctx, { isLast, handle, look }) {
  const { style, accent, text, muted } = look
  const ls = style.label.scale
  ctx.font = font(style.label, 22 * ls, Math.min(style.label.weight, 600))
  const spacing = style.label.spacing + 0.5

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
    ctx.font = font(style.label, 24 * ls, Math.min(style.label.weight, 600))
    ctx.fillStyle = rgba(text, 0.7)
    const w = measureSpaced(ctx, handle, 1.5)
    drawSpaced(ctx, handle, W - M - w, FOOTER_Y - 1, 1.5)
  }
}

// ------------------------------------------------------------------ style decorations

const pad2 = (n) => String(n).padStart(2, '0')

function drawRight(ctx, text, y, spacing) {
  drawSpaced(ctx, text, W - M - measureSpaced(ctx, text, spacing), y, spacing)
}

const DECOR = {
  caseFile: {
    top: true,
    draw(ctx, { index, total, look }) {
      ctx.strokeStyle = rgba(look.text, 0.28)
      ctx.lineWidth = 2
      ctx.strokeRect(36, 36, W - 72, H - 72)

      ctx.font = font(look.style.label, 22, 700)
      ctx.fillStyle = look.muted
      drawSpaced(ctx, `FILE ${pad2(index + 1)} / ${pad2(total)}`, M, 70, 4)
      ctx.fillStyle = look.accent
      drawRight(ctx, 'EVIDENCE', 70, 4)
    },
  },

  foundFootage: {
    top: true,
    draw(ctx, { index, look }) {
      ctx.font = font(look.style.label, 46)
      ctx.fillStyle = look.accent
      ctx.beginPath()
      ctx.arc(M + 12, 86, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = look.text
      drawSpaced(ctx, 'REC', M + 36, 68, 3)
      // A made-up but steady tape counter, so every slide looks like a later moment on the tape.
      drawRight(ctx, `0:${pad2(index * 7 + 2)}:${pad2((index * 37 + 11) % 60)}`, 68, 3)
    },
    after(ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0.16)'
      for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1)
    },
  },

  newspaper: {
    top: true,
    draw(ctx, { index, look }) {
      ctx.fillStyle = rgba(look.text, 0.75)
      ctx.fillRect(M, 58, W - M * 2, 3)
      ctx.fillRect(M, 66, W - M * 2, 1)
      ctx.font = font(look.style.label, 21, 600)
      ctx.fillStyle = look.muted
      drawSpaced(ctx, `NO. ${index + 1}`, M, 82, 3)
      ctx.fillStyle = look.accent
      drawRight(ctx, 'EXTRA', 82, 3)
    },
  },
}

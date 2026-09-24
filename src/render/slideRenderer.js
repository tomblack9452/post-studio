import { ACCENTS, BRAND } from '../config/brand'
import { applyGrain, gradedPhoto } from './grade'
import { drawSpaced, drawTokenLines, measureSpaced, tokenize, wrapTokens } from './text'

const W = BRAND.width
const H = BRAND.height
const M = BRAND.margin
const TEXT_WIDTH = W - M * 2
const TEXT_BOTTOM = H - 150 // leaves room for the footer row
const FOOTER_Y = H - 76
const SPLIT_PHOTO_H = Math.round(H * 0.58)

// Starting font sizes; the block shrinks uniformly until it fits its box.
const SIZES = {
  hook: { headline: 132, body: 38 },
  story: { headline: 84, body: 46 },
  question: { headline: 116, body: 38 },
}

const FLAG_LABELS = { disputed: 'DISPUTED', unverified: 'UNVERIFIED', theory: 'THEORY' }

const displayFont = (size) => `${size}px "${BRAND.fonts.display}", Impact, sans-serif`
const bodyFont = (size, weight = 400) => `${weight} ${size}px "${BRAND.fonts.body}", system-ui, sans-serif`

/**
 * Draws one slide onto a 1080x1350 canvas.
 * image: a loaded HTMLImageElement / canvas, or null.
 */
export function renderSlide(canvas, { slide, index, total, settings, image }) {
  const ctx = canvas.getContext('2d')
  const accent = (ACCENTS[settings.accent] || ACCENTS.cyan).hex
  const split = slide.layout === 'split'
  const photoH = split ? SPLIT_PHOTO_H : H

  ctx.save()
  ctx.textBaseline = 'top'
  ctx.fillStyle = BRAND.bg
  ctx.fillRect(0, 0, W, H)

  if (image) ctx.drawImage(gradedPhoto(image, W, photoH, slide.image || {}), 0, 0)
  drawScrim(ctx, split, photoH)

  // Split: text starts at a fixed line under the photo on every slide.
  // Full: text sits on the bottom edge.
  const boxTop = split ? photoH - 24 : Math.round(H * 0.4)
  const block = fitBlock(ctx, slide, TEXT_BOTTOM - boxTop)
  const y = split ? boxTop : TEXT_BOTTOM - block.height
  drawBlock(ctx, block, y, accent)

  drawFooter(ctx, { isLast: index >= total - 1, handle: settings.handle, accent })
  applyGrain(ctx, W, H, BRAND.grade.grain)
  ctx.restore()
}

function drawScrim(ctx, split, photoH) {
  const [r, g, b] = BRAND.bgRgb
  const c = (a) => `rgba(${r},${g},${b},${a})`
  if (split) {
    const grad = ctx.createLinearGradient(0, photoH * 0.5, 0, photoH)
    grad.addColorStop(0, c(0))
    grad.addColorStop(0.7, c(0.75))
    grad.addColorStop(1, c(1))
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, photoH)
    ctx.fillStyle = BRAND.bg
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

/** Lays out chip / kicker / headline / body, shrinking until it fits maxHeight. */
function fitBlock(ctx, slide, maxHeight) {
  const base = SIZES[slide.type] || SIZES.story
  const headline = (slide.headline || '').toUpperCase().trim()
  const body = (slide.body || '').trim()
  let block
  for (let s = 1; s >= 0.5; s -= 0.03) {
    block = measureBlock(ctx, slide, headline, body, Math.round(base.headline * s), Math.round(base.body * s))
    if (block.height <= maxHeight && !block.overflow) break
  }
  return block
}

function measureBlock(ctx, slide, headline, body, hSize, bSize) {
  const parts = []
  let overflow = false

  if (FLAG_LABELS[slide.flag]) parts.push({ kind: 'chip', text: FLAG_LABELS[slide.flag], h: 44, gap: 22 })
  if (slide.kicker?.trim()) parts.push({ kind: 'kicker', text: slide.kicker.trim().toUpperCase(), h: 30, gap: 26 })

  if (headline) {
    ctx.font = displayFont(hSize)
    const wrapped = wrapTokens(ctx, tokenize(headline), TEXT_WIDTH)
    overflow ||= wrapped.overflow
    const lh = Math.round(hSize * 1.06)
    parts.push({ kind: 'headline', wrapped, size: hSize, lh, h: wrapped.lines.length * lh, gap: Math.round(hSize * 0.3) })
  }
  if (body) {
    ctx.font = bodyFont(bSize)
    const wrapped = wrapTokens(ctx, tokenize(body), TEXT_WIDTH)
    overflow ||= wrapped.overflow
    const lh = Math.round(bSize * 1.42)
    parts.push({ kind: 'body', wrapped, size: bSize, lh, h: wrapped.lines.length * lh, gap: 0 })
  }

  const height = parts.reduce((sum, p, i) => sum + p.h + (i < parts.length - 1 ? p.gap : 0), 0)
  return { parts, height, overflow }
}

function drawBlock(ctx, block, y, accent) {
  for (const p of block.parts) {
    if (p.kind === 'chip') drawChip(ctx, p.text, M, y, accent)
    if (p.kind === 'kicker') drawKicker(ctx, p.text, M, y, accent)
    if (p.kind === 'headline') {
      ctx.font = displayFont(p.size)
      drawTokenLines(ctx, p.wrapped, M, y, p.lh, BRAND.text, accent)
    }
    if (p.kind === 'body') {
      ctx.font = bodyFont(p.size)
      drawTokenLines(ctx, p.wrapped, M, y, p.lh, BRAND.textSoft, accent)
    }
    y += p.h + p.gap
  }
}

function drawChip(ctx, text, x, y, accent) {
  ctx.font = bodyFont(20, 700)
  const spacing = 4
  const tw = measureSpaced(ctx, text, spacing)
  const padX = 16
  ctx.strokeStyle = accent
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(x + 1, y + 1, tw + padX * 2, 42, 4)
  ctx.stroke()
  ctx.fillStyle = accent
  drawSpaced(ctx, text, x + padX, y + 11, spacing)
}

function drawKicker(ctx, text, x, y, accent) {
  ctx.fillStyle = accent
  ctx.fillRect(x, y + 12, 36, 4)
  ctx.font = bodyFont(24, 700)
  drawSpaced(ctx, text, x + 52, y + 2, 4.5)
}

function drawFooter(ctx, { isLast, handle, accent }) {
  ctx.font = bodyFont(22, 600)
  const spacing = 5

  if (!isLast) {
    ctx.fillStyle = BRAND.muted
    const end = drawSpaced(ctx, 'SWIPE', M, FOOTER_Y, spacing)
    // arrow drawn as lines so it never depends on a glyph
    const ax = end + 18
    const ay = FOOTER_Y + 11
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
    ctx.font = bodyFont(24, 600)
    ctx.fillStyle = 'rgba(236, 232, 225, 0.7)'
    const w = measureSpaced(ctx, handle, 1.5)
    drawSpaced(ctx, handle, W - M - w, FOOTER_Y - 1, 1.5)
  }
}

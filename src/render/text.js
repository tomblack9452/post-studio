// Text layout helpers for the canvas.
// Markup: wrap words in *asterisks* to draw them in the accent colour.

export function tokenize(text) {
  const out = []
  String(text ?? '')
    .replace(/\r/g, '')
    .split('*')
    .forEach((part, i) => {
      const accent = i % 2 === 1
      part.split('\n').forEach((line, li) => {
        if (li > 0) out.push({ br: true })
        line
          .split(/\s+/)
          .filter(Boolean)
          .forEach((word) => out.push({ text: word, accent }))
      })
    })
  return out
}

/** Word-wrap tokens using the ctx's current font. */
export function wrapTokens(ctx, tokens, maxWidth) {
  const space = ctx.measureText(' ').width
  const lines = [[]]
  let lineWidth = 0
  let overflow = false
  for (const t of tokens) {
    if (t.br) {
      lines.push([])
      lineWidth = 0
      continue
    }
    const w = ctx.measureText(t.text).width
    if (w > maxWidth) overflow = true
    const line = lines[lines.length - 1]
    const add = line.length ? space + w : w
    if (line.length && lineWidth + add > maxWidth) {
      lines.push([{ ...t, w }])
      lineWidth = w
    } else {
      line.push({ ...t, w })
      lineWidth += add
    }
  }
  while (lines.length > 1 && lines[lines.length - 1].length === 0) lines.pop()
  return { lines, space, overflow }
}

export function drawTokenLines(ctx, { lines, space }, x, y, lineHeight, color, accent) {
  lines.forEach((line, i) => {
    let cx = x
    for (const t of line) {
      ctx.fillStyle = t.accent ? accent : color
      ctx.fillText(t.text, cx, y + i * lineHeight)
      cx += t.w + space
    }
  })
}

/** Letter-spaced text (ctx.letterSpacing isn't available everywhere). */
export function measureSpaced(ctx, text, spacing) {
  let w = 0
  for (const ch of text) w += ctx.measureText(ch).width + spacing
  return Math.max(0, w - spacing)
}

export function drawSpaced(ctx, text, x, y, spacing) {
  let cx = x
  for (const ch of text) {
    ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + spacing
  }
  return cx - spacing
}

export function stripMarkup(text) {
  return String(text ?? '').replace(/\*/g, '')
}

export function countWords(text) {
  return stripMarkup(text).split(/\s+/).filter(Boolean).length
}

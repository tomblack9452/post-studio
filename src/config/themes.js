// Colour schemes. Every colour on a slide comes from the active scheme:
//   accent - highlighted *words*, rules, arrows, flag chips
//   bg     - slide background and the fade over photos
//   text   - headline and body text (softer shades are derived from it)
//   tint   - colour pushed into the shadows of every photo

export const THEME_PRESETS = {
  phosphor: { name: 'Phosphor', accent: '#4fd1c5', bg: '#0b0c0d', text: '#ece8e1', tint: '#08181c' },
  signal: { name: 'Signal Red', accent: '#d7263d', bg: '#0b0c0d', text: '#ece8e1', tint: '#08181c' },
  sodium: { name: 'Sodium', accent: '#e8a33d', bg: '#0b0c0d', text: '#ece8e1', tint: '#08181c' },
  ectoplasm: { name: 'Ectoplasm', accent: '#9be564', bg: '#090c09', text: '#e6ede2', tint: '#0c2410' },
  seance: { name: 'Séance', accent: '#b48cff', bg: '#0c0a10', text: '#eae6f0', tint: '#1a0f2a' },
  moonlight: { name: 'Moonlight', accent: '#9cc9ff', bg: '#090b10', text: '#e8ecf2', tint: '#0a1628' },
  bloodMoon: { name: 'Blood Moon', accent: '#ff5a36', bg: '#100807', text: '#f0e4df', tint: '#2a0a06' },
  archive: { name: 'Archive (light)', accent: '#9e2a2b', bg: '#e8e0cf', text: '#1c1916', tint: '#3a2a14' },
}

export const THEME_KEYS = ['accent', 'bg', 'text', 'tint']

export const THEME_LABELS = {
  accent: 'Accent',
  bg: 'Background',
  text: 'Text',
  tint: 'Photo tint',
}

export const DEFAULT_THEME_ID = 'phosphor'

/** Just the colours of a scheme, so presets and saved schemes compare cleanly. */
export function themeColours(t) {
  const base = THEME_PRESETS[DEFAULT_THEME_ID]
  return Object.fromEntries(THEME_KEYS.map((k) => [k, normaliseHex(t?.[k]) || base[k]]))
}

export function sameColours(a, b) {
  return THEME_KEYS.every((k) => normaliseHex(a?.[k]) === normaliseHex(b?.[k]))
}

export function normaliseHex(hex) {
  const m = String(hex || '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return ''
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return `#${h.toLowerCase()}`
}

export function hexToRgb(hex) {
  const h = normaliseHex(hex).slice(1) || '000000'
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}

export function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Dark or light text, whichever reads better on this colour. */
export function inkOn(hex) {
  return luminance(hex) > 0.22 ? '#0b0c0d' : '#ffffff'
}

/** The accent as used in the app's own dark UI: very dark accents are lifted so they stay visible. */
export function uiAccent(hex) {
  const lum = luminance(hex)
  if (lum >= 0.14) return normaliseHex(hex)
  const mix = Math.min(0.55, 0.25 + (0.14 - lum) * 3)
  const [r, g, b] = hexToRgb(hex).map((v) => Math.round(v + (255 - v) * mix))
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

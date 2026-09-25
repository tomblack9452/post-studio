import { FONTS } from '../config/styles'

// Canvas can't draw a web font until it has loaded, so every render awaits this.
// Loads every weight any font choice or overlay uses (the fonts themselves come from index.html).
const faces = new Set([
  // overlay text (see OVERLAY_FONTS in slideRenderer.js)
  '700 32px "Courier Prime"',
  '400 32px "VT323"',
  '600 32px "Lora"',
  '700 32px "Caveat"',
])
for (const f of Object.values(FONTS)) {
  faces.add(`${f.display.weight} 64px "${f.display.family}"`)
  faces.add(`${f.body.weight} 32px "${f.body.family}"`)
  faces.add(`${f.label.weight} 32px "${f.label.family}"`)
  faces.add(`600 32px "${f.label.family}"`) // footer
}

export const fontsReady = Promise.all([...faces].map((f) => document.fonts.load(f).catch(() => {})))
  .then(() => document.fonts.ready)
  .catch(() => {})

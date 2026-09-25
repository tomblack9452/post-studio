import { POST_STYLES } from '../config/styles'

// Canvas can't draw a web font until it has loaded, so every render awaits this.
// Loads every weight any post style uses (the fonts themselves come from index.html).
const faces = new Set()
for (const s of Object.values(POST_STYLES)) {
  faces.add(`${s.display.weight} 64px "${s.display.family}"`)
  faces.add(`${s.body.weight} 32px "${s.body.family}"`)
  faces.add(`${s.label.weight} 32px "${s.label.family}"`)
  faces.add(`600 32px "${s.label.family}"`) // footer
}

export const fontsReady = Promise.all([...faces].map((f) => document.fonts.load(f).catch(() => {})))
  .then(() => document.fonts.ready)
  .catch(() => {})

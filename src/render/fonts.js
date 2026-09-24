import { BRAND } from '../config/brand'

// Canvas can't draw a web font until it has loaded, so every render awaits this.
export const fontsReady = Promise.all([
  document.fonts.load(`64px "${BRAND.fonts.display}"`),
  document.fonts.load(`400 32px "${BRAND.fonts.body}"`),
  document.fonts.load(`600 32px "${BRAND.fonts.body}"`),
  document.fonts.load(`700 32px "${BRAND.fonts.body}"`),
])
  .then(() => document.fonts.ready)
  .catch(() => {})

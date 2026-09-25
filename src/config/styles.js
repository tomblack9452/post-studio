// Post styles: typography, photo treatment and decoration for a whole carousel.
// Colours always come from the colour scheme, so every style works with every scheme.
//
//   display  headline font. scale shrinks wide fonts relative to condensed Anton.
//   body     story text font
//   label    kicker, flag chip and footer font (spacing = letter spacing in px)
//   grade    overrides for BRAND.grade (photo treatment)
//   decor    extra drawing in slideRenderer.js ('' for none)

export const POST_STYLES = {
  documentary: {
    name: 'Documentary',
    hint: 'Condensed caps over a faded photo',
    display: { family: 'Anton', weight: 400, uppercase: true, scale: 1, lineHeight: 1.06 },
    body: { family: 'Inter', weight: 400, scale: 1, lineHeight: 1.42 },
    label: { family: 'Inter', weight: 700, scale: 1, spacing: 4.5 },
    grade: {},
    decor: '',
  },
  caseFile: {
    name: 'Case file',
    hint: 'Typewritten dossier with evidence stamps',
    display: { family: 'Special Elite', weight: 400, uppercase: true, scale: 0.78, lineHeight: 1.18 },
    body: { family: 'Courier Prime', weight: 400, scale: 0.9, lineHeight: 1.45 },
    label: { family: 'Courier Prime', weight: 700, scale: 1.05, spacing: 3 },
    grade: { saturation: 0, contrast: 1.22, brightness: 0.78, blackLift: 18, grain: 0.14 },
    decor: 'caseFile',
  },
  foundFootage: {
    name: 'Found footage',
    hint: 'VHS camcorder: scanlines, colour bleed, REC',
    display: { family: 'VT323', weight: 400, uppercase: true, scale: 1.05, lineHeight: 0.92, glow: true },
    body: { family: 'Inter', weight: 500, scale: 0.95, lineHeight: 1.42 },
    label: { family: 'VT323', weight: 400, scale: 1.5, spacing: 2 },
    grade: { saturation: 0.5, contrast: 1.25, brightness: 0.85, grain: 0.16, rgbShift: 5 },
    decor: 'foundFootage',
  },
  newspaper: {
    name: 'Newspaper',
    hint: 'Old broadsheet: serif headlines, rules',
    display: { family: 'Playfair Display', weight: 900, uppercase: false, scale: 0.74, lineHeight: 1.06 },
    body: { family: 'Lora', weight: 400, scale: 0.95, lineHeight: 1.45 },
    label: { family: 'Lora', weight: 600, scale: 1, spacing: 3 },
    grade: { saturation: 0, contrast: 1.35, brightness: 0.88, blackLift: 14, grain: 0.09, vignette: 0.55 },
    decor: 'newspaper',
  },
  minimal: {
    name: 'Minimal',
    hint: 'Clean sans-serif, clearer photo, no grain',
    display: { family: 'Inter', weight: 800, uppercase: false, scale: 0.7, lineHeight: 1.1 },
    body: { family: 'Inter', weight: 400, scale: 1, lineHeight: 1.45 },
    label: { family: 'Inter', weight: 600, scale: 1, spacing: 3 },
    grade: { saturation: 0.55, contrast: 1.05, brightness: 0.85, blackLift: 0, vignette: 0.4, grain: 0 },
    decor: '',
  },
}

export const DEFAULT_STYLE = 'documentary'

export function getStyle(id) {
  return POST_STYLES[id] || POST_STYLES[DEFAULT_STYLE]
}

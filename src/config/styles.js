// A post's design has three independent parts, picked per post in the Design tab:
//   STYLES      layout: where the photo and the text sit on the slide
//   VARIATIONS  overlay and photo treatment: camcorder REC, case file tags, film strip...
//   FONTS       headline, body and label fonts
// Colours come from the colour scheme (themes.js), so every combination works with every scheme.

// Layouts are drawn in render/slideRenderer.js. `perSlideLayout`: the slide's Full/Split switch applies.
export const STYLES = {
  classic: { name: 'Classic', hint: 'Photo fills the slide, text over the fade', perSlideLayout: true },
  poster: { name: 'Poster', hint: 'Headline up top, photo rising from below' },
  framed: { name: 'Framed', hint: 'Bordered print with a figure label' },
  polaroid: { name: 'Polaroid', hint: 'Taped instant photo, like an evidence board' },
  lens: { name: 'Lens', hint: 'Photo seen through a round lens' },
}

// grade: overrides for BRAND.grade (mono = colour the whole photo one hue, e.g. night vision).
// stamp: draw flag chips as rubber stamps. Overlays are drawn in render/slideRenderer.js.
export const VARIATIONS = {
  none: { name: 'None', hint: 'Faded, grainy photo', grade: {} },
  clear: {
    name: 'Clear',
    hint: 'Cleaner photo, no grain',
    grade: { saturation: 0.55, contrast: 1.05, brightness: 0.85, blackLift: 0, vignette: 0.4, grain: 0 },
  },
  caseFile: {
    name: 'Case file',
    hint: 'Border, FILE and EVIDENCE tags, stamped flags',
    grade: { saturation: 0, contrast: 1.22, brightness: 0.78, blackLift: 18, grain: 0.14 },
    stamp: true,
  },
  camcorder: {
    name: 'Camcorder',
    hint: 'REC, tape counter, scanlines, colour bleed',
    grade: { saturation: 0.5, contrast: 1.25, brightness: 0.85, grain: 0.16, rgbShift: 5 },
  },
  ghostCam: {
    name: 'Ghost cam',
    hint: 'Night-vision green, viewfinder, 3 a.m. clock',
    grade: { saturation: 0, contrast: 1.35, brightness: 1.05, blackLift: 8, grain: 0.2, vignette: 0.85, mono: '#8dff9c' },
  },
  newspaper: {
    name: 'Newspaper',
    hint: 'Double rule, issue number, black and white',
    grade: { saturation: 0, contrast: 1.35, brightness: 0.88, blackLift: 14, grain: 0.09, vignette: 0.55 },
  },
  filmStrip: {
    name: 'Film strip',
    hint: 'Sprocket holes and frame numbers',
    grade: { saturation: 0.4, contrast: 1.18, brightness: 0.85, blackLift: 16, grain: 0.15 },
  },
}

//   display  headline font. scale sizes wide fonts relative to condensed Anton.
//   body     story text font
//   label    kicker, flag chip and footer font (spacing = letter spacing in px)
export const FONTS = {
  condensed: {
    name: 'Condensed',
    display: { family: 'Anton', weight: 400, uppercase: true, scale: 1, lineHeight: 1.06 },
    body: { family: 'Inter', weight: 400, scale: 1, lineHeight: 1.42 },
    label: { family: 'Inter', weight: 700, scale: 1, spacing: 4.5 },
  },
  typewriter: {
    name: 'Typewriter',
    display: { family: 'Special Elite', weight: 400, uppercase: true, scale: 0.78, lineHeight: 1.18 },
    body: { family: 'Courier Prime', weight: 400, scale: 0.9, lineHeight: 1.45 },
    label: { family: 'Courier Prime', weight: 700, scale: 1.05, spacing: 3 },
  },
  pixel: {
    name: 'Pixel',
    display: { family: 'VT323', weight: 400, uppercase: true, scale: 1.05, lineHeight: 0.92, glow: true },
    body: { family: 'Inter', weight: 500, scale: 0.95, lineHeight: 1.42 },
    label: { family: 'VT323', weight: 400, scale: 1.5, spacing: 2 },
  },
  serif: {
    name: 'Serif',
    display: { family: 'Playfair Display', weight: 900, uppercase: false, scale: 0.84, lineHeight: 1.06 },
    body: { family: 'Lora', weight: 400, scale: 0.95, lineHeight: 1.45 },
    label: { family: 'Lora', weight: 600, scale: 1, spacing: 3 },
  },
  engraved: {
    name: 'Engraved',
    display: { family: 'Cinzel', weight: 700, uppercase: true, scale: 0.72, lineHeight: 1.12 },
    body: { family: 'EB Garamond', weight: 400, scale: 1.08, lineHeight: 1.38 },
    label: { family: 'Cinzel', weight: 700, scale: 0.95, spacing: 4 },
  },
  handwritten: {
    name: 'Handwritten',
    display: { family: 'Caveat', weight: 700, uppercase: false, scale: 1.05, lineHeight: 0.98 },
    body: { family: 'Inter', weight: 400, scale: 1, lineHeight: 1.42 },
    label: { family: 'Caveat', weight: 700, scale: 1.4, spacing: 1 },
  },
  clean: {
    name: 'Clean',
    display: { family: 'Inter', weight: 800, uppercase: false, scale: 0.8, lineHeight: 1.1 },
    body: { family: 'Inter', weight: 400, scale: 1, lineHeight: 1.45 },
    label: { family: 'Inter', weight: 600, scale: 1, spacing: 3 },
  },
}

export const DESIGN_PARTS = { style: STYLES, variation: VARIATIONS, font: FONTS }
export const DEFAULT_DESIGN = { style: 'classic', variation: 'none', font: 'condensed' }

// Before the split, a post had one combined "style". Old drafts and settings map onto the parts.
const LEGACY = {
  documentary: { style: 'classic', variation: 'none', font: 'condensed' },
  caseFile: { style: 'classic', variation: 'caseFile', font: 'typewriter' },
  foundFootage: { style: 'classic', variation: 'camcorder', font: 'pixel' },
  newspaper: { style: 'classic', variation: 'newspaper', font: 'serif' },
  minimal: { style: 'classic', variation: 'clear', font: 'clean' },
}

/** Valid { style, variation, font } ids for a draft (or settings), upgrading old combined styles. */
export function resolveDesign(d = {}) {
  const legacy = LEGACY[d.style]
  const ids = legacy ? { ...legacy, ...pick(d, ['variation', 'font']) } : pick(d, ['style', 'variation', 'font'])
  for (const [key, list] of Object.entries(DESIGN_PARTS)) if (!list[ids[key]]) ids[key] = DEFAULT_DESIGN[key]
  return ids
}

/** The full definitions for a draft's design. */
export function getDesign(d) {
  const ids = resolveDesign(d)
  return { ids, style: STYLES[ids.style], variation: VARIATIONS[ids.variation], font: FONTS[ids.font] }
}

function pick(obj, keys) {
  const out = {}
  for (const k of keys) if (obj?.[k]) out[k] = obj[k]
  return out
}

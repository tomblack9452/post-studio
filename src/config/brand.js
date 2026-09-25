// Everything that defines the page's look lives here, so every post matches.
// Colours live in themes.js (colour schemes); typography and photo treatment per style in styles.js.

import { DEFAULT_THEME_ID, THEME_PRESETS, themeColours } from './themes'
import { DEFAULT_STYLE } from './styles'

export const BRAND = {
  width: 1080,
  height: 1350,
  margin: 88,

  // Default photo treatment. Post styles override parts of it; the shadow tint comes from the colour scheme.
  grade: {
    saturation: 0.22, // 0 = greyscale, 1 = original
    contrast: 1.14,
    brightness: 0.8,
    blackLift: 10, // faded-film shadows (0-255)
    tintStrength: 0.35,
    vignette: 0.72, // edge darkness 0-1
    grain: 0.1, // grain overlay opacity 0-1
    rgbShift: 0, // VHS-style colour bleed in px
  },
}

// Instagram's limits: up to 20 images per carousel, up to 5 hashtags per post.
export const MIN_SLIDES = 5
export const MAX_SLIDES = 20
export const MAX_HASHTAGS = 5

export const SLIDE_TYPES = {
  hook: { label: 'Hook', headlineMaxWords: 8, bodyMaxWords: 20 },
  story: { label: 'Story', headlineMaxWords: 8, bodyMaxWords: 40 },
  question: { label: 'Question', headlineMaxWords: 12, bodyMaxWords: 20 },
}

export const FLAGS = {
  '': 'None',
  disputed: 'Disputed',
  unverified: 'Unverified',
  theory: 'Theory',
}

export const DEFAULT_SETTINGS = {
  handle: '@yourhandle',
  theme: themeColours(THEME_PRESETS[DEFAULT_THEME_ID]), // the colours in use
  themeId: DEFAULT_THEME_ID, // preset key or saved scheme id the colours came from
  customThemes: [], // saved schemes: { id, name, accent, bg, text, tint }
  style: DEFAULT_STYLE, // post style for new posts (the last one picked)
  model: 'claude-sonnet-5',
  provider: 'api', // 'api' | 'pro'
  effort: 'low', // Claude Pro only: low | medium | high | xhigh | max
  lockCategory: false, // Random only picks topics from the chosen category
  length: 'auto', // post length: auto | short | medium | long (see LENGTHS in store.js)
}

// Bump when a default above changes in a way that should override saved settings.
export const SETTINGS_VERSION = 3

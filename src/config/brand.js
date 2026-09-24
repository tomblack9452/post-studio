// Everything that defines the page's look lives here, so every post matches.

export const ACCENTS = {
  cyan: { name: 'Phosphor Cyan', hex: '#4FD1C5' },
  red: { name: 'Signal Red', hex: '#D7263D' },
  amber: { name: 'Sodium Amber', hex: '#E8A33D' },
}

export const BRAND = {
  width: 1080,
  height: 1350,
  margin: 88,

  bg: '#0B0C0D',
  bgRgb: [11, 12, 13],
  text: '#ECE8E1', // off-white, never pure #FFF
  textSoft: 'rgba(236, 232, 225, 0.9)',
  muted: 'rgba(236, 232, 225, 0.55)',

  fonts: {
    display: 'Anton', // condensed caps headlines
    body: 'Inter', // readable story text
  },

  // Applied to every photo in the canvas render
  grade: {
    saturation: 0.22, // 0 = greyscale, 1 = original
    contrast: 1.14,
    brightness: 0.8,
    blackLift: 10, // faded-film shadows (0-255)
    shadowTint: [8, 24, 28], // cool teal shadows, sits well with any accent
    tintStrength: 0.35,
    vignette: 0.72, // edge darkness 0-1
    grain: 0.1, // grain overlay opacity 0-1
  },
}

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
  accent: 'cyan',
  model: 'claude-sonnet-5',
}

// Bump when a default above changes in a way that should override saved settings.
export const SETTINGS_VERSION = 2

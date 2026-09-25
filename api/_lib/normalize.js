import { LIMITS, MAX_HASHTAGS, MAX_SLIDES, MIN_SLIDES } from './prompts.js'

// Tidies model output and reports rule breaks, so the editor can flag them.

const countWords = (s) => String(s || '').replace(/\*/g, '').split(/\s+/).filter(Boolean).length

export function normalizeSlide(raw, fallbackType = 'story') {
  const type = LIMITS[raw.type] ? raw.type : fallbackType
  return {
    type,
    layout: type === 'story' ? 'split' : 'full',
    kicker: tidy(raw.kicker).replace(/\*/g, ''), // kickers don't support accent markup
    headline: balanceAsterisks(tidy(raw.headline)),
    body: balanceAsterisks(tidy(raw.body)),
    flag: ['disputed', 'unverified', 'theory'].includes(raw.flag) ? raw.flag : '',
    imageQuery: tidy(raw.image_query),
    imageSource: ['wikimedia', 'nasa', 'apod'].includes(raw.image_source) ? raw.image_source : 'wikimedia',
  }
}

export function normalizePost(raw) {
  let slides = (raw.slides || []).map((s) => normalizeSlide(s))
  // Enforce the shape: hook first, question last, at most MAX_SLIDES.
  if (slides.length > MAX_SLIDES) slides = [...slides.slice(0, MAX_SLIDES - 1), slides[slides.length - 1]]
  if (slides[0]) slides[0].type = 'hook'
  if (slides.length > 1) slides[slides.length - 1].type = 'question'
  for (const s of slides) s.layout = s.type === 'story' ? 'split' : 'full'

  const hashtags = [
    ...new Set(
      (raw.hashtags || [])
        .map((h) => '#' + String(h).toLowerCase().replace(/^#+/, '').replace(/[^a-z0-9_]/g, ''))
        .filter((h) => h.length > 2),
    ),
  ].slice(0, MAX_HASHTAGS) // Instagram's limit

  const caption = [raw.caption_hook, ...(raw.caption_paragraphs || []), raw.comment_prompt]
    .map(tidy)
    .filter(Boolean)
    .join('\n\n')

  const warnings = []
  if (slides.length < MIN_SLIDES) warnings.push(`Only ${slides.length} slides were generated (aim for at least ${MIN_SLIDES}).`)
  slides.forEach((s, i) => warnings.push(...slideWarnings(s, i)))
  if (hashtags.length < MAX_HASHTAGS) warnings.push(`Only ${hashtags.length} hashtags (Instagram allows ${MAX_HASHTAGS}).`)

  return {
    category: raw.category,
    slides,
    caption,
    hashtags,
    factCheck: (raw.fact_check || []).map(tidy).filter(Boolean),
    warnings,
  }
}

export function slideWarnings(s, i) {
  const lim = LIMITS[s.type]
  const out = []
  const hw = countWords(s.headline)
  const bw = countWords(s.body)
  if (hw > lim.headline) out.push(`Slide ${i + 1}: headline is ${hw} words (max ${lim.headline}).`)
  if (bw > lim.body) out.push(`Slide ${i + 1}: body is ${bw} words (max ${lim.body}).`)
  return out
}

function tidy(s) {
  return String(s ?? '').replace(/\s+\n/g, '\n').trim()
}

function balanceAsterisks(s) {
  return (s.match(/\*/g) || []).length % 2 ? s.replace(/\*(?!.*\*)/, '') : s
}

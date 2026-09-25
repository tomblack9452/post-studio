import { MAX_SLIDES, MIN_SLIDES, SLIDE_TYPES } from '../config/brand'
import { countWords } from '../render/text'

export function slideWarnings(slide) {
  const rules = SLIDE_TYPES[slide.type] || SLIDE_TYPES.story
  const out = []
  const hw = countWords(slide.headline)
  const bw = countWords(slide.body)
  if (hw > rules.headlineMaxWords) out.push(`Headline is ${hw} words (max ${rules.headlineMaxWords})`)
  if (bw > rules.bodyMaxWords) out.push(`Body is ${bw} words (max ${rules.bodyMaxWords})`)
  if (!hw && !bw) out.push('Slide has no text')
  if ((slide.headline || '').split('*').length % 2 === 0) out.push('Unclosed *accent* in headline')
  if ((slide.body || '').split('*').length % 2 === 0) out.push('Unclosed *accent* in body')
  return out
}

export function draftWarnings(draft) {
  const out = []
  const n = draft.slides.length
  if (n < MIN_SLIDES) out.push(`Carousel has ${n} slides (aim for at least ${MIN_SLIDES})`)
  if (n > MAX_SLIDES) out.push(`Carousel has ${n} slides (Instagram allows ${MAX_SLIDES})`)
  if (draft.slides[0]?.type !== 'hook') out.push('First slide should be a hook')
  if (draft.slides[n - 1]?.type !== 'question') out.push('Last slide should be a question')
  return out
}

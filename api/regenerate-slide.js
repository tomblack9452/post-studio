import { generateJson } from './_lib/claude.js'
import { fail, json } from './_lib/http.js'
import { normalizeSlide, slideWarnings } from './_lib/normalize.js'
import { SLIDE_SCHEMA, slideRequest } from './_lib/prompts.js'

// POST /api/regenerate-slide  { topic, slides: [{type,kicker,headline,body}], index, instruction? }
export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const topic = String(body.topic || '').trim().slice(0, 200)
  const slides = Array.isArray(body.slides) ? body.slides.slice(0, 10) : []
  const index = Number(body.index)
  const instruction = String(body.instruction || '').trim().slice(0, 300)
  if (!topic) return fail('The post has no topic')
  if (!Number.isInteger(index) || !slides[index]) return fail('Invalid slide index')

  const clean = slides.map((s) => ({
    type: String(s.type || 'story'),
    kicker: String(s.kicker || '').slice(0, 80),
    headline: String(s.headline || '').slice(0, 200),
    body: String(s.body || '').slice(0, 600),
  }))

  try {
    const { data, usage } = await generateJson({
      user: slideRequest({ topic, slides: clean, index, instruction }),
      schema: SLIDE_SCHEMA,
      maxTokens: 1000,
      model: body.model,
    })
    const slide = normalizeSlide(data.slide, clean[index].type)
    slide.type = clean[index].type // never let a rewrite change the slide's role
    return json({ slide, warnings: slideWarnings(slide, index), usage })
  } catch (e) {
    return fail(e.message || 'Regeneration failed', e.status || 500)
  }
}

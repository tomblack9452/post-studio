import { generateJson } from './_lib/claude.js'
import { fail, json } from './_lib/http.js'
import { normalizePost, normalizeSlide, slideWarnings } from './_lib/normalize.js'
import { CATEGORIES, LIMITS, POST_SCHEMA, SLIDE_SCHEMA, postRequest, slideRequest } from './_lib/prompts.js'

// POST /api/generate  { topic, category?, model? }  -> full carousel draft
export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const topic = String(body.topic || '').trim().slice(0, 200)
  const category = CATEGORIES.includes(body.category) ? body.category : ''
  if (!topic) return fail('Enter a topic')

  try {
    const { data, usage } = await generateJson({
      user: postRequest(topic, category),
      schema: POST_SCHEMA,
      model: body.model,
    })
    const post = normalizePost(data)
    await shortenOverLimitSlides(post, topic, body.model, usage)
    return json({ ...post, topic, usage })
  } catch (e) {
    return fail(e.message || 'Generation failed', e.status || 500)
  }
}

// Models sometimes overshoot the word limits. Give each long slide one cheap rewrite.
async function shortenOverLimitSlides(post, topic, model, usage) {
  const long = post.slides.map((s, i) => [s, i]).filter(([s, i]) => slideWarnings(s, i).length)
  if (!long.length) return

  await Promise.all(
    long.map(async ([slide, index]) => {
      const lim = LIMITS[slide.type]
      try {
        const { data, usage: u } = await generateJson({
          user: slideRequest({
            topic,
            slides: post.slides,
            index,
            instruction: `Too long. Keep the same facts but cut the body to at most ${lim.body - 4} words and the headline to at most ${lim.headline} words.`,
          }),
          schema: SLIDE_SCHEMA,
          maxTokens: 1000,
          model,
        })
        const fixed = normalizeSlide(data.slide, slide.type)
        if (slideWarnings(fixed, index).length) return // still too long: keep original, the editor flags it
        Object.assign(slide, { ...fixed, type: slide.type, layout: slide.layout })
        usage.inputTokens += u.inputTokens
        usage.outputTokens += u.outputTokens
        if (usage.costUsd != null && u.costUsd != null) usage.costUsd += u.costUsd
      } catch {
        /* keep the original slide */
      }
    }),
  )

  post.warnings = post.warnings.filter((w) => !/^Slide \d+:/.test(w))
  post.slides.forEach((s, i) => post.warnings.push(...slideWarnings(s, i)))
}

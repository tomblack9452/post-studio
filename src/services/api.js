// Browser-side wrappers for the /api functions.

async function request(url, options) {
  const r = await fetch(url, options)
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`)
  return data
}

const post = (url, body) =>
  request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

export function searchImages(source, q, page = '') {
  return request(`/api/images?${new URLSearchParams({ source, q, page })}`)
}

export function resolveNasaAsset(nasaId) {
  return request(`/api/images?${new URLSearchParams({ source: 'nasa-asset', id: nasaId })}`)
}

/** Same-origin URL for a remote image, so the canvas can export it. */
export function proxied(url) {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

/** Turns a search result into the image object stored on a slide. */
export async function resultToImage(result) {
  const full = result.full || (await resolveNasaAsset(result.nasaId)).full
  return {
    src: proxied(full),
    originalUrl: full,
    provider: result.provider,
    title: result.title,
    credit: result.credit,
    licence: result.licence,
    licenceUrl: result.licenceUrl,
    attributionRequired: result.attributionRequired,
    sourceUrl: result.sourceUrl,
    focusX: 0.5,
    focusY: 0.5,
    zoom: 1,
  }
}

export function generatePost({ topic, category, model }) {
  return post('/api/generate', { topic, category, model })
}

export function regenerateSlide({ topic, slides, index, instruction, model }) {
  return post('/api/regenerate-slide', {
    topic,
    index,
    instruction,
    model,
    slides: slides.map(({ type, kicker, headline, body }) => ({ type, kicker, headline, body })),
  })
}

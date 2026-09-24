import { loadSlideImage } from '../render/images'
import { resultToImage, searchImages } from './api'

/**
 * Picks a first image for every slide from its AI-suggested query.
 * Runs one slide at a time (Wikimedia throttles bursts) and avoids reusing
 * the same picture twice. Slides with no match keep their placeholder.
 */
export async function fillSlideImages(draft, onProgress = () => {}) {
  const used = new Set()
  const cache = new Map()
  const slideIds = draft.slides.map((s) => s.id)

  async function search(source, q) {
    const key = `${source}|${q}`
    if (!cache.has(key)) cache.set(key, searchImages(source, q).then((d) => d.results).catch(() => []))
    return cache.get(key)
  }

  for (let i = 0; i < slideIds.length; i++) {
    onProgress(i + 1, slideIds.length)
    const slide = draft.slides.find((s) => s.id === slideIds[i])
    if (!slide) continue // deleted while we were working

    const q = slide.imageQuery || draft.topic
    const attempts = [
      [slide.imageSource || 'wikimedia', q],
      ['wikimedia', q],
      ['wikimedia', draft.topic],
    ]
    for (const [source, query] of attempts) {
      const pick = (await search(source, query)).find((r) => !used.has(r.id))
      if (!pick) continue
      try {
        const image = await resultToImage(pick)
        used.add(pick.id)
        await loadSlideImage(image.src) // make sure it actually loads before using it
        slide.image = image
        break
      } catch {
        used.add(pick.id) // unusable (e.g. no suitable NASA size); try the next attempt
      }
    }
  }
}

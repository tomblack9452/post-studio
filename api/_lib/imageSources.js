import { HttpError, USER_AGENT } from './http.js'

// Every result is normalised to this shape:
// { id, provider, title, thumb, full, width, height, credit, licence, licenceUrl,
//   attributionRequired, sourceUrl, description }
// `full` may be null for NASA results; call resolveNasaAsset() when the image is picked.

const MAX_IMAGE_BYTES = 4 * 1024 * 1024 // Vercel function responses are capped at ~4.5 MB

// ---------------------------------------------------------------- Wikimedia

// Only licences that allow reuse on a commercial social account.
const REUSABLE_LICENCE = /^(pd|cc0|cc-by(-sa)?(-[\d.]+.*)?|attribution|no restrictions)$/i
const REUSABLE_SHORT_NAME = /^(public domain|pd\b|cc0|cc by(-sa)? [\d.]+|cc by(-sa)?$|no restrictions|attribution$)/i

// Commons hosts AI-generated images; a factual page shouldn't pass them off as real.
const AI_GENERATED = /ai[- ]generated|generated (by|with|using) (an )?ai|chatgpt|dall[·-]?e|midjourney|stable diffusion|gpt-?4o|firefly|imagen\b/i

function isAiGenerated(meta) {
  const text = ['Categories', 'Artist', 'Credit', 'ImageDescription'].map((k) => meta[k]?.value || '').join(' ')
  return AI_GENERATED.test(text)
}

function isReusable(meta) {
  const code = meta.License?.value || ''
  const name = meta.LicenseShortName?.value || ''
  return REUSABLE_LICENCE.test(code) || REUSABLE_SHORT_NAME.test(name)
}

export async function searchWikimedia(q, page) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: `${q} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '40',
    gsroffset: page || '0',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '1920',
    iiextmetadatafilter:
      'License|LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|ObjectName|AttributionRequired|Categories',
    iiextmetadatalanguage: 'en',
  })
  const r = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'user-agent': USER_AGENT },
  })
  if (!r.ok) throw new HttpError(`Wikimedia search failed (${r.status})`)
  const data = await r.json()

  const pages = (data.query?.pages || []).sort((a, b) => a.index - b.index)
  const results = []
  for (const p of pages) {
    const ii = p.imageinfo?.[0]
    if (!ii) continue
    const meta = ii.extmetadata || {}
    if (!/^image\/(jpeg|png|webp|tiff)$/.test(ii.mime)) continue
    if (Math.min(ii.width, ii.height) < 600) continue
    if (!isReusable(meta)) continue
    if (isAiGenerated(meta)) continue

    const full = stripTracking(ii.thumburl || ii.url)
    // Originals under 1920px are served as-is (no thumbnail); skip ones too big to proxy.
    const isOriginal = !ii.thumburl || ii.thumburl === ii.url
    if (isOriginal && ii.size > MAX_IMAGE_BYTES) continue
    results.push({
      id: `wm:${p.pageid}`,
      provider: 'wikimedia',
      title: stripHtml(meta.ObjectName?.value) || p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
      thumb: full.replace(/\/1920px-/, '/500px-'),
      full,
      width: ii.width,
      height: ii.height,
      credit: stripHtml(meta.Artist?.value) || stripHtml(meta.Credit?.value) || 'Unknown author',
      licence: meta.LicenseShortName?.value || 'See source',
      licenceUrl: meta.LicenseUrl?.value || '',
      attributionRequired: meta.AttributionRequired?.value === 'true',
      sourceUrl: ii.descriptionurl,
      description: stripHtml(meta.ImageDescription?.value).slice(0, 400),
    })
  }
  return { results, nextPage: data.continue?.gsroffset != null ? String(data.continue.gsroffset) : null }
}

// ---------------------------------------------------------------- NASA Image and Video Library

export async function searchNasa(q, page) {
  const current = Number(page) || 1
  const params = new URLSearchParams({ q, media_type: 'image', page: String(current), page_size: '40' })
  const r = await fetch(`https://images-api.nasa.gov/search?${params}`)
  if (!r.ok) throw new HttpError(`NASA library search failed (${r.status})`)
  const data = await r.json()
  const collection = data.collection || {}

  const results = (collection.items || [])
    .map((item) => {
      const d = item.data?.[0]
      const preview = item.links?.find((l) => l.rel === 'preview')?.href
      if (!d || !preview) return null
      return {
        id: `nasa:${d.nasa_id}`,
        provider: 'nasa',
        nasaId: d.nasa_id,
        title: d.title,
        thumb: https(preview),
        full: null,
        width: null,
        height: null,
        credit: [d.photographer, d.secondary_creator, d.center && `NASA ${d.center}`].filter(Boolean).join(' / ') || 'NASA',
        licence: 'NASA media, generally not copyrighted. Check the credit for third-party material.',
        licenceUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
        attributionRequired: false,
        sourceUrl: `https://images.nasa.gov/details/${encodeURIComponent(d.nasa_id)}`,
        description: stripHtml(d.description).slice(0, 400),
        date: d.date_created?.slice(0, 10),
      }
    })
    .filter(Boolean)

  const hasNext = collection.links?.some((l) => l.rel === 'next')
  return { results, nextPage: hasNext ? String(current + 1) : null }
}

/** Picks the largest rendition of a NASA asset that fits the size cap. */
export async function resolveNasaAsset(nasaId) {
  if (!nasaId) throw new HttpError('Missing NASA id', 400)
  const r = await fetch(`https://images-api.nasa.gov/asset/${encodeURIComponent(nasaId)}`)
  if (!r.ok) throw new HttpError(`NASA asset lookup failed (${r.status})`)
  const hrefs = ((await r.json()).collection?.items || []).map((i) => https(i.href))

  for (const size of ['large', 'medium', 'orig', 'small']) {
    const href = hrefs.find((h) => new RegExp(`~${size}\\.(jpe?g|png)$`, 'i').test(h))
    if (!href) continue
    const head = await fetch(href, { method: 'HEAD' }).catch(() => null)
    const bytes = Number(head?.headers.get('content-length') || 0)
    if (head?.ok && (!bytes || bytes <= MAX_IMAGE_BYTES)) return { full: href }
  }
  throw new HttpError('No usable image size found for this NASA item')
}

// ---------------------------------------------------------------- APOD

export async function searchApod(q) {
  const key = process.env.NASA_API_KEY || 'DEMO_KEY'
  const params = new URLSearchParams({ api_key: key, count: q ? '100' : '40' })
  const r = await fetch(`https://api.nasa.gov/planetary/apod?${params}`)
  if (r.status === 429) {
    throw new HttpError('NASA rate limit reached. Add a free NASA_API_KEY to .env (api.nasa.gov).', 429)
  }
  if (!r.ok) throw new HttpError(`APOD request failed (${r.status})`)
  const items = await r.json()

  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
  const results = items
    // Items with a `copyright` field belong to the photographer, not NASA: not free to reuse.
    .filter((it) => it.media_type === 'image' && !it.copyright && it.url)
    .filter((it) => {
      if (!words.length) return true
      const text = `${it.title} ${it.explanation}`.toLowerCase()
      return words.some((w) => text.includes(w))
    })
    .map((it) => ({
      id: `apod:${it.date}`,
      provider: 'apod',
      title: it.title,
      thumb: https(it.url),
      full: https(it.url), // standard size; hdurl is often too large to proxy
      width: null,
      height: null,
      credit: `NASA Astronomy Picture of the Day, ${it.date}`,
      licence: 'Public domain (no copyright listed on APOD)',
      licenceUrl: 'https://apod.nasa.gov/apod/lib/about_apod.html',
      attributionRequired: false,
      sourceUrl: `https://apod.nasa.gov/apod/ap${it.date.slice(2).replace(/-/g, '')}.html`,
      description: (it.explanation || '').slice(0, 400),
      date: it.date,
    }))

  // APOD has no search or paging, so "more" just draws another random batch.
  return { results, nextPage: 'more' }
}

// ---------------------------------------------------------------- helpers

function stripTracking(url) {
  const u = new URL(url)
  for (const key of [...u.searchParams.keys()]) if (key.startsWith('utm_')) u.searchParams.delete(key)
  return u.href
}

function https(url) {
  return String(url || '').replace(/^http:\/\//, 'https://')
}

function stripHtml(html) {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export { MAX_IMAGE_BYTES }

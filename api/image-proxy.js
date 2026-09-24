import { fail, USER_AGENT } from './_lib/http.js'
import { MAX_IMAGE_BYTES } from './_lib/imageSources.js'

// GET /api/image-proxy?url=<image url>
// Re-serves images from the approved sources from our own origin, so the canvas
// isn't "tainted" and slides can be exported as PNG.
// Only these hosts are allowed, so this can't be used as an open proxy.
const ALLOWED_HOSTS = new Set([
  'upload.wikimedia.org',
  'thumb.wikimedia.org',
  'images-assets.nasa.gov',
  'apod.nasa.gov',
])

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get('url')
  if (!raw) return fail('Missing url')

  let upstream
  try {
    upstream = await fetchAllowed(raw)
  } catch (e) {
    return fail(e.message, 400)
  }
  if (!upstream.ok) return fail(`Image source returned ${upstream.status}`, 502)

  const type = upstream.headers.get('content-type') || ''
  if (!type.startsWith('image/')) return fail('Not an image', 415)
  if (Number(upstream.headers.get('content-length') || 0) > MAX_IMAGE_BYTES) {
    return fail('Image is too large (over 4 MB). Pick a different one.', 413)
  }

  const body = await upstream.arrayBuffer()
  if (body.byteLength > MAX_IMAGE_BYTES) return fail('Image is too large (over 4 MB). Pick a different one.', 413)

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': type,
      'cache-control': 'public, max-age=86400, immutable',
    },
  })
}

// Follows redirects by hand so every hop is checked against the allowlist.
async function fetchAllowed(url, maxHops = 3) {
  let current = url
  for (let hop = 0; hop <= maxHops; hop++) {
    const u = new URL(current)
    if (u.protocol === 'http:') u.protocol = 'https:'
    if (u.protocol !== 'https:' || !ALLOWED_HOSTS.has(u.hostname)) {
      throw new Error(`Host not allowed: ${u.hostname}`)
    }
    const r = await fetchWithRetry(u)
    const location = r.headers.get('location')
    if (r.status >= 300 && r.status < 400 && location) {
      current = new URL(location, u).href
      continue
    }
    return r
  }
  throw new Error('Too many redirects')
}

// Wikimedia throttles bursts (e.g. a whole carousel loading at once): back off and retry.
async function fetchWithRetry(url, attempts = 3) {
  for (let i = 0; ; i++) {
    const r = await fetch(url, { redirect: 'manual', headers: { 'user-agent': USER_AGENT } })
    if (![429, 503].includes(r.status) || i >= attempts - 1) return r
    const wait = Math.min(Number(r.headers.get('retry-after')) * 1000 || 800 * 2 ** i, 4000)
    await new Promise((resolve) => setTimeout(resolve, wait))
  }
}

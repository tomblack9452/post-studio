import { fail, json } from './_lib/http.js'
import { resolveNasaAsset, searchApod, searchNasa, searchWikimedia } from './_lib/imageSources.js'

// GET /api/images?source=wikimedia|nasa|apod&q=...&page=...
// GET /api/images?source=nasa-asset&id=<nasa_id>
export async function GET(request) {
  const params = new URL(request.url).searchParams
  const source = params.get('source') || 'wikimedia'
  const q = (params.get('q') || '').trim().slice(0, 200)
  const page = params.get('page') || ''

  try {
    if (source === 'nasa-asset') return json(await resolveNasaAsset(params.get('id')))

    const search = { wikimedia: searchWikimedia, nasa: searchNasa, apod: searchApod }[source]
    if (!search) return fail('Unknown image source')
    if (!q && source !== 'apod') return fail('Enter a search term')

    const cache = source === 'apod' ? 'no-store' : 'public, max-age=600'
    return json(await search(q, page), 200, { 'cache-control': cache })
  } catch (e) {
    return fail(e.message || 'Image search failed', e.status || 502)
  }
}

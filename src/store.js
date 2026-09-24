import { reactive, watch } from 'vue'
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from './config/brand'
import { demoDraft } from './data/demoDraft'
import { generatePost, regenerateSlide as apiRegenerateSlide } from './services/api'
import { fillSlideImages } from './services/autoImages'
import * as db from './services/db'
import { newDraft, newSlide, uid } from './services/draftModel'
import { downloadBlob } from './services/exporter'
import { makeThumbnail } from './services/thumbnail'

const SETTINGS_KEY = 'post-studio.settings'
const LAST_OPEN_KEY = 'post-studio.lastOpen'

export const MODELS = {
  'claude-sonnet-5': 'Sonnet 5 · accurate (~2¢/post)',
  'claude-haiku-4-5': 'Haiku 4.5 · cheapest (~1¢/post)',
}

// ------------------------------------------------------------------ settings

function loadSettings() {
  const defaults = { ...DEFAULT_SETTINGS, version: SETTINGS_VERSION }
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    // v2: default model changed from Haiku to Sonnet 5.
    if ((saved.version || 1) < 2) delete saved.model
    return { ...defaults, ...saved, version: SETTINGS_VERSION }
  } catch {
    return defaults
  }
}

export const settings = reactive(loadSettings())
watch(settings, (v) => safeLocalSet(SETTINGS_KEY, JSON.stringify(v)), { deep: true })

function safeLocalSet(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable: just won't persist */
  }
}

// ------------------------------------------------------------------ state

// The draft currently open in the editor.
export const draft = reactive(demoDraft())

// Transient UI state.
export const ui = reactive({
  view: 'editor', // 'editor' | 'drafts'
  busy: false,
  status: '',
  error: '',
  warnings: [],
  lastUsage: null,
})

// Saved drafts (summaries only; full drafts are loaded on open).
export const library = reactive({
  items: [],
  loaded: false,
  error: '',
  saveState: 'idle', // 'idle' | 'saving' | 'saved' | 'error'
})

// ------------------------------------------------------------------ autosave

let lastSavedSignature = JSON.stringify(draft)
let lastThumbKey = ''
let lastThumb = ''
let saveTimer = null

const plain = (obj) => JSON.parse(JSON.stringify(obj))

watch(
  draft,
  () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(persist, 700)
  },
  { deep: true },
)

// The thumbnail shows the accent colour and handle, so refresh it when those change.
watch(
  () => [settings.accent, settings.handle],
  () => {
    lastThumbKey = ''
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => persist({ force: true }), 700)
  },
)

async function persist({ force = false } = {}) {
  clearTimeout(saveTimer)
  saveTimer = null
  const signature = JSON.stringify(draft)
  const changed = signature !== lastSavedSignature
  if (!changed && !force) return
  if (draft.demo) {
    // A real edit of the sample post turns it into a saved draft (this triggers another save).
    // Loading the sample, or changing the accent colour, doesn't count as an edit.
    if (changed) draft.demo = false
    return
  }
  lastSavedSignature = signature

  library.saveState = 'saving'
  try {
    const record = plain(draft)
    record.updatedAt = new Date().toISOString()

    const thumbKey = JSON.stringify([record.slides[0], record.slides.length, settings.accent, settings.handle])
    if (thumbKey !== lastThumbKey) {
      lastThumb = await makeThumbnail(record, settings).catch(() => lastThumb)
      lastThumbKey = thumbKey
    }
    record.thumb = lastThumb

    await db.putDraft(record)
    upsertSummary(record)
    safeLocalSet(LAST_OPEN_KEY, record.id)
    library.saveState = 'saved'
  } catch (e) {
    library.saveState = 'error'
    library.error = `Could not save: ${e.message}`
  }
}

/** Saves any pending edit right away (before switching drafts, closing the tab...). */
export function flushSave() {
  if (!saveTimer) return Promise.resolve()
  return persist()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => flushSave())
  document.addEventListener('visibilitychange', () => document.hidden && flushSave())
}

function summarize(r) {
  return {
    id: r.id,
    topic: r.topic,
    category: r.category,
    status: r.status || 'draft',
    postedAt: r.postedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    slideCount: r.slides?.length || 0,
    thumb: r.thumb || '',
  }
}

function upsertSummary(record) {
  const s = summarize(record)
  const i = library.items.findIndex((x) => x.id === s.id)
  if (i >= 0) library.items.splice(i, 1, s)
  else library.items.push(s)
}

function loadIntoEditor(record) {
  const { thumb, ...rest } = record
  for (const key of Object.keys(draft)) delete draft[key]
  Object.assign(draft, rest)
  // Mark as already saved so opening a draft doesn't bump its "edited" time.
  lastSavedSignature = JSON.stringify(draft)
  lastThumb = thumb || ''
  lastThumbKey = ''
  clearTimeout(saveTimer)
  saveTimer = null
  safeLocalSet(LAST_OPEN_KEY, record.id)
}

// ------------------------------------------------------------------ library actions

export async function initLibrary() {
  try {
    const records = await db.getAllDrafts()
    library.items = records.map(summarize)
    library.loaded = true
    navigator.storage?.persist?.().catch(() => {})

    let lastOpen = ''
    try {
      lastOpen = localStorage.getItem(LAST_OPEN_KEY) || ''
    } catch {
      /* ignore */
    }
    const byRecent = [...records].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    const toOpen = records.find((r) => r.id === lastOpen) || byRecent[0]
    if (toOpen) loadIntoEditor(toOpen)
  } catch (e) {
    library.loaded = true
    library.error = `Saved drafts are unavailable in this browser (${e.message}). Export posts to keep them.`
  }
}

export async function openDraft(id) {
  await flushSave()
  const record = await db.getDraft(id)
  if (!record) throw new Error('That draft no longer exists')
  loadIntoEditor(record)
  ui.view = 'editor'
}

export async function newEmptyDraft() {
  await flushSave()
  loadIntoEditor(
    newDraft({
      topic: 'Untitled post',
      slides: [newSlide('hook'), newSlide('story'), newSlide('story'), newSlide('story'), newSlide('question')],
    }),
  )
  lastSavedSignature = '' // save it straight away so it appears in the list
  await persist()
  ui.view = 'editor'
}

export async function duplicateDraft(id) {
  await flushSave()
  const record = await db.getDraft(id)
  const now = new Date().toISOString()
  const copy = {
    ...record,
    id: uid(),
    topic: `${record.topic} (copy)`,
    status: 'draft',
    postedAt: null,
    createdAt: now,
    updatedAt: now,
    slides: record.slides.map((s) => ({ ...s, id: uid() })),
  }
  await db.putDraft(copy)
  upsertSummary(copy)
}

export async function removeDraft(id) {
  await db.deleteDraft(id)
  library.items = library.items.filter((x) => x.id !== id)
  if (draft.id === id) {
    const next = [...library.items].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0]
    if (next) await openDraft(next.id)
    else loadIntoEditor(demoDraft())
    ui.view = 'drafts'
  }
}

/** Sets status on the open draft, or on a saved one by id. */
export async function setStatus(status, id = draft.id) {
  const postedAt = status === 'posted' ? new Date().toISOString() : null
  if (id === draft.id) {
    draft.status = status
    draft.postedAt = postedAt
    draft.demo = false
    await persist()
    return
  }
  const record = await db.getDraft(id)
  if (!record) return
  Object.assign(record, { status, postedAt, updatedAt: new Date().toISOString() })
  await db.putDraft(record)
  upsertSummary(record)
}

// ------------------------------------------------------------------ backup

export async function exportBackup() {
  await flushSave()
  const drafts = await db.getAllDrafts()
  const data = { app: 'post-studio', version: 1, exportedAt: new Date().toISOString(), drafts }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  downloadBlob(blob, `post-studio-backup-${new Date().toISOString().slice(0, 10)}.json`)
  return drafts.length
}

/** Merges a backup file. Keeps whichever copy of a draft was edited most recently. */
export async function importBackup(file) {
  let data
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('That file is not valid JSON')
  }
  if (data?.app !== 'post-studio' || !Array.isArray(data.drafts)) {
    throw new Error('That file is not a Post Studio backup')
  }
  const valid = data.drafts.filter((d) => d && typeof d.id === 'string' && Array.isArray(d.slides))
  const existing = new Map((await db.getAllDrafts()).map((d) => [d.id, d]))
  const toWrite = valid.filter((d) => !existing.has(d.id) || (d.updatedAt || '') > (existing.get(d.id).updatedAt || ''))
  await db.putMany(toWrite)
  toWrite.forEach(upsertSummary)
  return { imported: toWrite.length, skipped: data.drafts.length - toWrite.length }
}

// ------------------------------------------------------------------ generation

export async function generate({ topic, category }) {
  await flushSave()
  ui.busy = true
  ui.error = ''
  ui.warnings = []
  ui.status = 'Writing slides and caption…'
  ui.view = 'editor'
  try {
    const result = await generatePost({ topic, category, model: settings.model })
    loadIntoEditor(
      newDraft({
        topic: result.topic,
        category: result.category,
        caption: result.caption,
        hashtags: result.hashtags,
        factCheck: result.factCheck,
        model: result.usage.model,
        slides: result.slides.map((s) => newSlide(s.type, s)),
      }),
    )
    lastSavedSignature = '' // new post: save it
    await persist()
    ui.warnings = result.warnings
    ui.lastUsage = result.usage
    await fillSlideImages(draft, (i, n) => (ui.status = `Finding images ${i}/${n}…`))
  } catch (e) {
    ui.error = e.message
  } finally {
    ui.busy = false
    ui.status = ''
  }
}

/** Rewrites one slide's text. Returns the previous text so the caller can offer undo. */
export async function regenerateSlide(index, instruction = '') {
  const slide = draft.slides[index]
  const previous = pickText(slide)
  const result = await apiRegenerateSlide({
    topic: draft.topic,
    slides: draft.slides,
    index,
    instruction,
    model: settings.model,
  })
  Object.assign(slide, pickText(result.slide))
  ui.lastUsage = result.usage
  return previous
}

export function pickText(s) {
  const { kicker, headline, body, flag, imageQuery, imageSource } = s
  return { kicker, headline, body, flag, imageQuery, imageSource }
}

// ------------------------------------------------------------------ slide editing

export function addSlide(afterIndex, type = 'story') {
  const slide = newSlide(type)
  draft.slides.splice(afterIndex + 1, 0, slide)
  return afterIndex + 1
}

export function duplicateSlide(index) {
  const copy = plain(draft.slides[index])
  copy.id = uid()
  draft.slides.splice(index + 1, 0, copy)
  return index + 1
}

export function removeSlide(index) {
  if (draft.slides.length <= 1) return index
  draft.slides.splice(index, 1)
  return Math.min(index, draft.slides.length - 1)
}

export function moveSlide(index, delta) {
  const to = index + delta
  if (to < 0 || to >= draft.slides.length) return index
  const [s] = draft.slides.splice(index, 1)
  draft.slides.splice(to, 0, s)
  return to
}

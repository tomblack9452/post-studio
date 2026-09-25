import { reactive, watch } from 'vue'
import { DEFAULT_SETTINGS, MAX_SLIDES, SETTINGS_VERSION } from './config/brand'
import { DESIGN_PARTS, resolveDesign } from './config/styles'
import { sameColours, THEME_PRESETS, themeColours } from './config/themes'
import { demoDraft } from './data/demoDraft'
import { generatePost, regenerateSlide as apiRegenerateSlide } from './services/api'
import { fillSlideImages } from './services/autoImages'
import * as db from './services/db'
import { newDraft, newSlide, uid } from './services/draftModel'
import { downloadBlob } from './services/exporter'
import { makeThumbnail } from './services/thumbnail'

const SETTINGS_KEY = 'post-studio.settings'
const LAST_OPEN_KEY = 'post-studio.lastOpen'

// Where AI calls go: the paid API key in .env, or the Claude CLI logged in with a Claude Pro plan.
export const PROVIDERS = {
  api: 'API key',
  pro: 'Claude Pro',
}

// `api` = offered on the API key (with a rough cost); every model is offered on Claude Pro.
// `more` = listed under "More models". `credits` = needs usage credits on a Pro plan.
export const MODELS = {
  'claude-opus-5-5': { name: 'Opus 5.5', note: 'Most capable Opus' },
  'claude-sonnet-5': { name: 'Sonnet 5', note: 'Fast and accurate', api: '~2¢/post' },
  'claude-fable-5-1': { name: 'Fable 5.1', note: 'Most capable, slowest', credits: true },
  'claude-haiku-4-5': { name: 'Haiku 4.5', note: 'Fastest, less accurate', api: '~1¢/post' },
  'claude-opus-5': { name: 'Opus 5', more: true },
  'claude-fable-5': { name: 'Fable 5', more: true, credits: true },
  'claude-opus-4-8': { name: 'Opus 4.8', more: true },
  'claude-opus-4-7': { name: 'Opus 4.7', more: true },
  'claude-opus-4-6': { name: 'Opus 4.6', more: true },
  'claude-sonnet-4-6': { name: 'Sonnet 4.6', more: true },
}

// How many slides to ask for. Instagram allows up to 20.
export const LENGTHS = {
  auto: { name: 'Auto', range: '5–20' },
  short: { name: 'Short', range: '5–8' },
  medium: { name: 'Medium', range: '9–12' },
  long: { name: 'Long', range: '13–20' },
}

// Faster -> smarter, for Claude Pro. Higher levels think longer and use more of the plan's limit.
export const EFFORTS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra high',
  max: 'Max',
}

// ------------------------------------------------------------------ settings

function loadSettings() {
  const defaults = { ...DEFAULT_SETTINGS, version: SETTINGS_VERSION }
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    // v2: default model changed from Haiku to Sonnet 5.
    if ((saved.version || 1) < 2) delete saved.model
    // v3: the three accent swatches became full colour schemes.
    if ((saved.version || 1) < 3 && saved.accent) {
      const id = { cyan: 'phosphor', red: 'signal', amber: 'sodium' }[saved.accent] || 'phosphor'
      saved.themeId = id
      saved.theme = themeColours(THEME_PRESETS[id])
      delete saved.accent
    }
    // v4: the combined post style split into style / variation / font (before defaults fill the gaps).
    if ((saved.version || 1) < 4 && saved.style) Object.assign(saved, resolveDesign(saved))
    const merged = { ...defaults, ...saved, version: SETTINGS_VERSION }
    merged.theme = themeColours(merged.theme)
    if (!Array.isArray(merged.customThemes)) merged.customThemes = []
    Object.assign(merged, resolveDesign(merged)) // drop any unknown ids
    return merged
  } catch {
    return defaults
  }
}

export const settings = reactive(loadSettings())
safeLocalSet(SETTINGS_KEY, JSON.stringify(settings)) // store any migration straight away
watch(settings, (v) => safeLocalSet(SETTINGS_KEY, JSON.stringify(v)), { deep: true })

// ------------------------------------------------------------------ colour schemes

/** Every scheme to pick from: presets first, then saved ones. */
export function allThemes() {
  return [
    ...Object.entries(THEME_PRESETS).map(([id, t]) => ({ id, preset: true, ...t })),
    ...settings.customThemes.map((t) => ({ ...t, preset: false })),
  ]
}

export function findTheme(id) {
  return allThemes().find((t) => t.id === id)
}

export function applyTheme(id) {
  const t = findTheme(id)
  if (!t) return
  settings.theme = themeColours(t)
  settings.themeId = id
}

/** True when the colours in use no longer match the scheme they were picked from. */
export function themeModified() {
  const t = findTheme(settings.themeId)
  return !t || !sameColours(t, settings.theme)
}

export function saveThemeAs(name) {
  const t = { id: `custom-${uid()}`, name: name.trim().slice(0, 40) || 'My scheme', ...themeColours(settings.theme) }
  settings.customThemes.push(t)
  settings.themeId = t.id
  return t
}

/** Overwrites the saved scheme currently in use with the current colours. */
export function updateTheme() {
  const t = settings.customThemes.find((x) => x.id === settings.themeId)
  if (t) Object.assign(t, themeColours(settings.theme))
}

export function renameTheme(id, name) {
  const t = settings.customThemes.find((x) => x.id === id)
  if (t && name.trim()) t.name = name.trim().slice(0, 40)
}

export function deleteTheme(id) {
  settings.customThemes = settings.customThemes.filter((t) => t.id !== id)
  // Keep the colours on screen; they just no longer belong to a saved scheme.
  if (settings.themeId === id) settings.themeId = ''
}

// ------------------------------------------------------------------ post design

/** The design new posts start with: the last style, variation and font picked. */
function designForNewPost() {
  return resolveDesign(settings)
}

/**
 * Sets one part of the open post's design (part: 'style' | 'variation' | 'font'),
 * and makes the whole design the default for new posts.
 */
export function setDesign(part, id) {
  if (!DESIGN_PARTS[part]?.[id]) return
  const design = { ...resolveDesign(draft), [part]: id }
  Object.assign(draft, design)
  Object.assign(settings, design)
}

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
  panel: 'slide', // editor side panel: 'slide' | 'design' | 'caption'
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

// The thumbnail shows the colour scheme and handle, so refresh it when those change.
watch(
  () => [settings.theme, settings.handle],
  () => {
    lastThumbKey = ''
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => persist({ force: true }), 700)
  },
  { deep: true },
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

    const thumbKey = JSON.stringify([record.slides[0], record.slides.length, resolveDesign(record), settings.theme, settings.handle])
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
      ...designForNewPost(),
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
  ui.status = settings.provider === 'pro' ? 'Writing slides and caption with Claude Pro (can take a minute or more)…' : 'Writing slides and caption…'
  ui.view = 'editor'
  try {
    const result = await generatePost({
      topic,
      category,
      length: settings.length,
      model: settings.model,
      provider: settings.provider,
      effort: settings.effort,
    })
    loadIntoEditor(
      newDraft({
        topic: result.topic,
        category: result.category,
        ...designForNewPost(),
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
    provider: settings.provider,
    effort: settings.effort,
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
  if (draft.slides.length >= MAX_SLIDES) return afterIndex
  const slide = newSlide(type)
  draft.slides.splice(afterIndex + 1, 0, slide)
  return afterIndex + 1
}

export function duplicateSlide(index) {
  if (draft.slides.length >= MAX_SLIDES) return index
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

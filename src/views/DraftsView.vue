<script setup>
import { computed, ref } from 'vue'
import { CATEGORY_LABELS } from '../data/topics'
import {
  draft,
  duplicateDraft,
  exportBackup,
  importBackup,
  library,
  newEmptyDraft,
  openDraft,
  removeDraft,
  setStatus,
} from '../store'

const STATUSES = { draft: 'Draft', ready: 'Ready', posted: 'Posted' }

const filter = ref('all')
const query = ref('')
const message = ref('')
const error = ref('')
const fileInput = ref(null)

const counts = computed(() => {
  const c = { all: library.items.length, draft: 0, ready: 0, posted: 0 }
  for (const d of library.items) c[d.status] = (c[d.status] || 0) + 1
  return c
})

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return library.items
    .filter((d) => filter.value === 'all' || d.status === filter.value)
    .filter((d) => !q || (d.topic || '').toLowerCase().includes(q))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
})

async function act(fn, ...args) {
  error.value = ''
  message.value = ''
  try {
    return await fn(...args)
  } catch (e) {
    error.value = e.message
  }
}

function confirmDelete(item) {
  if (window.confirm(`Delete "${item.topic}"? This can't be undone.`)) act(removeDraft, item.id)
}

async function backup() {
  const n = await act(exportBackup)
  if (n != null) message.value = `Backed up ${n} draft${n === 1 ? '' : 's'}.`
}

async function onImport(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  const r = await act(importBackup, file)
  if (r) message.value = `Imported ${r.imported}${r.skipped ? `, skipped ${r.skipped} (newer copy already here)` : ''}.`
}

function when(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const mins = Math.round((Date.now() - d) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <main class="drafts">
    <header class="head">
      <div class="title">
        <h1>Drafts</h1>
        <span class="muted">{{ counts.posted }} posted · {{ counts.ready }} ready · {{ counts.draft }} in progress</span>
      </div>
      <div class="tools">
        <button class="btn primary" @click="act(newEmptyDraft)">+ New empty post</button>
        <button class="btn" :disabled="!library.items.length" @click="backup">Export backup</button>
        <button class="btn" @click="fileInput.click()">Import backup</button>
        <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="onImport" />
      </div>
    </header>

    <div class="filters">
      <div class="seg">
        <button v-for="key in ['all', 'draft', 'ready', 'posted']" :key="key" :class="{ on: filter === key }" @click="filter = key">
          {{ key === 'all' ? 'All' : STATUSES[key] }} <span class="count">{{ counts[key] || 0 }}</span>
        </button>
      </div>
      <input v-model="query" class="search" placeholder="Search topics" aria-label="Search topics" />
    </div>

    <p v-if="library.error" class="note error">{{ library.error }}</p>
    <p v-if="error" class="note error">{{ error }}</p>
    <p v-if="message" class="note">{{ message }}</p>

    <p v-if="library.loaded && !library.items.length" class="empty muted">
      No saved drafts yet. Generate a post, or edit the sample post, and it will be saved here automatically.
    </p>
    <p v-else-if="library.loaded && !visible.length" class="empty muted">Nothing matches.</p>

    <div class="grid">
      <article v-for="item in visible" :key="item.id" class="card" :class="{ current: item.id === draft.id }">
        <button class="thumb" :title="`Open ${item.topic}`" @click="act(openDraft, item.id)">
          <img v-if="item.thumb" :src="item.thumb" :alt="item.topic" />
          <span v-else class="no-thumb">No preview</span>
          <span class="badge" :class="item.status">{{ STATUSES[item.status] }}</span>
          <span v-if="item.id === draft.id" class="open-now">Open</span>
        </button>
        <div class="info">
          <h2>{{ item.topic || 'Untitled' }}</h2>
          <p class="muted">
            {{ CATEGORY_LABELS[item.category] || 'Uncategorised' }} · {{ item.slideCount }} slides
          </p>
          <p class="muted">
            <template v-if="item.status === 'posted' && item.postedAt">Posted {{ when(item.postedAt) }}</template>
            <template v-else>Edited {{ when(item.updatedAt) }}</template>
          </p>
        </div>
        <div class="card-actions">
          <select :value="item.status" aria-label="Status" @change="act(setStatus, $event.target.value, item.id)">
            <option v-for="(label, key) in STATUSES" :key="key" :value="key">{{ label }}</option>
          </select>
          <button class="btn icon" title="Duplicate" @click="act(duplicateDraft, item.id)">⧉</button>
          <button class="btn icon danger" title="Delete" @click="confirmDelete(item)">✕</button>
        </div>
      </article>
    </div>
  </main>
</template>

<style scoped>
.drafts {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 28px 48px;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}
.title {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
}
h1 {
  margin: 0;
  font-size: 22px;
}
.tools {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.filters {
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 20px 0 16px;
  flex-wrap: wrap;
}
.seg {
  display: flex;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 3px;
  gap: 3px;
}
.seg button {
  all: unset;
  cursor: pointer;
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 6px;
  color: var(--muted);
}
.seg button.on {
  background: var(--surface-3);
  color: var(--text);
  box-shadow: inset 0 0 0 1px var(--line-strong);
}
.seg button:focus-visible {
  outline: 2px solid var(--accent);
}
.count {
  opacity: 0.6;
  margin-left: 2px;
}
.search {
  width: 240px;
}
.note {
  margin: 0 0 12px;
  font-size: 13px;
}
.note.error {
  color: var(--danger);
}
.empty {
  margin: 40px 0;
  text-align: center;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 18px;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.thumb {
  all: unset;
  cursor: pointer;
  position: relative;
  aspect-ratio: 4 / 5;
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-2);
  outline: 2px solid transparent;
  outline-offset: 3px;
  transition: outline-color 0.15s;
}
.thumb:hover {
  outline-color: var(--line-strong);
}
.thumb:focus-visible,
.card.current .thumb {
  outline-color: var(--accent);
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.no-thumb {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 12px;
}
.badge,
.open-now {
  position: absolute;
  top: 8px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: rgba(11, 12, 13, 0.85);
  border: 1px solid var(--line-strong);
}
.badge {
  left: 8px;
}
.badge.ready {
  color: var(--accent);
  border-color: var(--accent);
}
.badge.posted {
  color: #0b0c0d;
  background: var(--accent);
  border-color: var(--accent);
}
.open-now {
  right: 8px;
  color: var(--muted);
}
.info h2 {
  margin: 0 0 4px;
  font-size: 14px;
  line-height: 1.3;
}
.info p {
  margin: 0;
  font-size: 12px;
}
.card-actions {
  display: grid;
  grid-template-columns: 1fr 36px 36px;
  gap: 6px;
  margin-top: auto;
}
.card-actions select {
  padding: 6px 8px;
  font-size: 13px;
}
</style>

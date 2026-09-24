<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { resultToImage, searchImages } from '../services/api'

const props = defineProps({
  initialQuery: { type: String, default: '' },
  initialSource: { type: String, default: 'wikimedia' },
})
const emit = defineEmits(['pick', 'close'])

const SOURCES = {
  wikimedia: { label: 'Wikimedia Commons', hint: 'History, places, people, archive photos' },
  nasa: { label: 'NASA Library', hint: 'Missions, telescopes, space imagery' },
  apod: { label: 'NASA APOD', hint: 'Random Astronomy Pictures of the Day, filtered by your words' },
}

const source = ref(props.initialSource)
const query = ref(props.initialQuery)
const results = ref([])
const nextPage = ref(null)
const loading = ref(false)
const error = ref('')
const selected = ref(null)
const picking = ref(false)
const searchInput = ref(null)
let searchId = 0

const canSearch = computed(() => source.value === 'apod' || query.value.trim())

async function search(append = false) {
  if (!canSearch.value) return
  const id = ++searchId
  loading.value = true
  error.value = ''
  if (!append) {
    results.value = []
    selected.value = null
  }
  try {
    const data = await searchImages(source.value, query.value.trim(), append ? nextPage.value : '')
    if (id !== searchId) return
    const seen = new Set(results.value.map((r) => r.id))
    results.value.push(...data.results.filter((r) => !seen.has(r.id)))
    nextPage.value = data.nextPage
  } catch (e) {
    if (id === searchId) error.value = e.message
  } finally {
    if (id === searchId) loading.value = false
  }
}

function setSource(key) {
  source.value = key
  search()
}

async function use(result) {
  picking.value = true
  error.value = ''
  try {
    emit('pick', await resultToImage(result))
  } catch (e) {
    error.value = e.message
  } finally {
    picking.value = false
  }
}

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  await nextTick()
  searchInput.value?.focus()
  if (canSearch.value) search()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div class="backdrop" @click.self="emit('close')">
      <div class="picker" role="dialog" aria-label="Find an image">
        <header class="head">
          <form class="search" @submit.prevent="search()">
            <input
              ref="searchInput"
              v-model="query"
              :placeholder="source === 'apod' ? 'Optional keywords, e.g. nebula' : 'Search, e.g. Dyatlov Pass'"
            />
            <button class="btn primary" :disabled="!canSearch || loading">Search</button>
          </form>
          <button class="btn icon close" title="Close" @click="emit('close')">✕</button>
        </header>

        <nav class="sources">
          <button v-for="(s, key) in SOURCES" :key="key" :class="{ on: source === key }" @click="setSource(key)">
            {{ s.label }}
          </button>
          <span class="muted hint">{{ SOURCES[source].hint }}</span>
        </nav>

        <div class="body">
          <div class="results">
            <p v-if="error" class="error">{{ error }}</p>
            <p v-else-if="!loading && !results.length" class="muted empty">
              {{ canSearch ? 'No reusable images found. Try broader words or another source.' : 'Type a search.' }}
            </p>
            <div class="grid">
              <button
                v-for="r in results"
                :key="r.id"
                class="tile"
                :class="{ active: selected?.id === r.id }"
                :title="r.title"
                @click="selected = r"
                @dblclick="use(r)"
              >
                <img :src="r.thumb" :alt="r.title" loading="lazy" referrerpolicy="no-referrer" />
              </button>
            </div>
            <div class="more">
              <span v-if="loading" class="muted">Searching…</span>
              <button v-else-if="nextPage && results.length" class="btn" @click="search(true)">Load more</button>
            </div>
          </div>

          <aside class="details">
            <template v-if="selected">
              <img class="preview" :src="selected.thumb" :alt="selected.title" referrerpolicy="no-referrer" />
              <h4>{{ selected.title }}</h4>
              <dl>
                <dt>Credit</dt>
                <dd>{{ selected.credit }}</dd>
                <dt>Licence</dt>
                <dd>
                  <a v-if="selected.licenceUrl" :href="selected.licenceUrl" target="_blank" rel="noopener">
                    {{ selected.licence }}
                  </a>
                  <span v-else>{{ selected.licence }}</span>
                  <span v-if="selected.attributionRequired" class="tag">Credit required</span>
                </dd>
                <template v-if="selected.width">
                  <dt>Size</dt>
                  <dd>{{ selected.width }} × {{ selected.height }}</dd>
                </template>
                <template v-if="selected.date">
                  <dt>Date</dt>
                  <dd>{{ selected.date }}</dd>
                </template>
              </dl>
              <p v-if="selected.description" class="desc">{{ selected.description }}</p>
              <a :href="selected.sourceUrl" target="_blank" rel="noopener" class="src">View source ↗</a>
              <button class="btn primary use" :disabled="picking" @click="use(selected)">
                {{ picking ? 'Loading…' : 'Use on this slide' }}
              </button>
            </template>
            <p v-else class="muted">
              Pick an image to see its licence. Only public domain, CC0, CC BY and CC BY-SA images are shown.
              Credits are saved with the slide.
            </p>
          </aside>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.7);
  display: grid;
  place-items: center;
  padding: 24px;
}
.picker {
  width: min(1180px, 100%);
  height: min(820px, 100%);
  background: var(--bg);
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.head {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}
.search {
  flex: 1;
  display: flex;
  gap: 8px;
}
.close {
  width: 38px;
}
.sources {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
}
.sources button {
  all: unset;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--muted);
}
.sources button.on {
  color: var(--text);
  background: var(--surface-3);
  box-shadow: inset 0 0 0 1px var(--line-strong);
}
.sources button:focus-visible {
  outline: 2px solid var(--accent);
}
.hint {
  margin-left: 8px;
  font-size: 12px;
}
.body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
}
.results {
  overflow-y: auto;
  padding: 16px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}
.tile {
  all: unset;
  cursor: pointer;
  aspect-ratio: 4 / 5;
  border-radius: 6px;
  overflow: hidden;
  background: var(--surface-2);
  outline: 2px solid transparent;
  outline-offset: 2px;
}
.tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.tile:hover {
  outline-color: var(--line-strong);
}
.tile.active,
.tile:focus-visible {
  outline-color: var(--accent);
}
.more {
  display: flex;
  justify-content: center;
  padding: 16px 0 4px;
}
.empty,
.error {
  margin: 0 0 12px;
}
.error {
  color: var(--danger);
}
.details {
  border-left: 1px solid var(--line);
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.preview {
  width: 100%;
  max-height: 260px;
  object-fit: contain;
  background: var(--surface-2);
  border-radius: 6px;
}
h4 {
  margin: 0;
  font-size: 15px;
}
dl {
  margin: 0;
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 6px 10px;
  font-size: 13px;
}
dt {
  color: var(--muted);
}
dd {
  margin: 0;
  overflow-wrap: anywhere;
}
dd a,
.src {
  color: var(--accent);
  font-size: 13px;
}
.tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid var(--warn);
  color: var(--warn);
}
.desc {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--muted);
}
.use {
  margin-top: auto;
}

@media (max-width: 760px) {
  .body {
    grid-template-columns: 1fr;
  }
  .details {
    border-left: 0;
    border-top: 1px solid var(--line);
    max-height: 45%;
  }
}
</style>

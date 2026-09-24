<script setup>
import { computed, ref } from 'vue'
import { FLAGS, SLIDE_TYPES } from '../config/brand'
import { countWords } from '../render/text'
import { placeholderImage } from '../services/draftModel'
import { slideWarnings } from '../services/validate'
import { draft, regenerateSlide, ui } from '../store'
import ImagePicker from './ImagePicker.vue'

const props = defineProps({
  slide: { type: Object, required: true },
  index: { type: Number, required: true },
})

const instruction = ref('')
const regenBusy = ref(false)
const regenError = ref('')
const undo = ref(null) // { slideId, text } from the last regenerate

async function regenerate() {
  regenBusy.value = true
  regenError.value = ''
  const slideId = props.slide.id
  try {
    const text = await regenerateSlide(props.index, instruction.value)
    undo.value = { slideId, text }
    instruction.value = ''
  } catch (e) {
    regenError.value = e.message
  } finally {
    regenBusy.value = false
  }
}

function undoRegenerate() {
  const target = draft.slides.find((s) => s.id === undo.value?.slideId)
  if (target) Object.assign(target, undo.value.text)
  undo.value = null
}

const rules = computed(() => SLIDE_TYPES[props.slide.type] || SLIDE_TYPES.story)
const headlineWords = computed(() => countWords(props.slide.headline))
const bodyWords = computed(() => countWords(props.slide.body))
const warnings = computed(() => slideWarnings(props.slide))
const fileInput = ref(null)
const pickerOpen = ref(false)
const pickerSource = computed(() => (draft.category === 'space' ? 'nasa' : 'wikimedia'))

function onPick(image) {
  props.slide.image = image
  pickerOpen.value = false
}

const HEADLINE_HINTS = {
  hook: 'The signal that lasted *72 seconds*',
  story: 'Optional, story slides usually skip this',
  question: 'So what *was* it?',
}

function setType(type) {
  props.slide.type = type
}

function usePlaceholder() {
  props.slide.image = placeholderImage()
}

// Local uploads are downscaled and stored inline so drafts stay self-contained.
async function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  const src = await downscale(file, 2000)
  props.slide.image = {
    src,
    provider: 'upload',
    title: file.name,
    credit: 'Your upload',
    licence: 'Check you have the rights to use this',
    sourceUrl: '',
    focusX: 0.5,
    focusY: 0.5,
    zoom: 1,
  }
}

function downscale(file, maxSide) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const s = Math.min(1, maxSide / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s)
      c.height = Math.round(img.height * s)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image'))
    }
    img.src = url
  })
}
</script>

<template>
  <div class="slide-editor">
    <section class="group">
      <h3>Slide</h3>
      <div class="seg">
        <button
          v-for="(t, key) in SLIDE_TYPES"
          :key="key"
          :class="{ on: slide.type === key }"
          @click="setType(key)"
        >
          {{ t.label }}
        </button>
      </div>
      <div class="seg">
        <button :class="{ on: slide.layout === 'full' }" @click="slide.layout = 'full'">Full-bleed</button>
        <button :class="{ on: slide.layout === 'split' }" @click="slide.layout = 'split'">Split</button>
      </div>
    </section>

    <section class="group">
      <h3>Text</h3>
      <div class="regen">
        <input
          v-model="instruction"
          placeholder="Optional note, e.g. shorter, mention the 2020 ruling"
          :disabled="regenBusy || ui.busy || !draft.topic"
          @keydown.enter.prevent="regenerate"
        />
        <div class="row">
          <button class="btn" :disabled="regenBusy || ui.busy || !draft.topic" @click="regenerate">
            {{ regenBusy ? 'Rewriting…' : '↻ Regenerate slide' }}
          </button>
          <button class="btn" :disabled="!undo || undo.slideId !== slide.id" @click="undoRegenerate">Undo</button>
        </div>
        <p v-if="regenError" class="error">{{ regenError }}</p>
      </div>

      <label class="field">
        <span class="label">Kicker <em>small label above the text</em></span>
        <input v-model="slide.kicker" placeholder="e.g. August 15, 1977 · Ohio" />
      </label>

      <label class="field">
        <span class="label">
          Headline
          <em :class="{ over: headlineWords > rules.headlineMaxWords }">
            {{ headlineWords }} / {{ rules.headlineMaxWords }} words
          </em>
        </span>
        <input v-model="slide.headline" :placeholder="HEADLINE_HINTS[slide.type]" />
      </label>

      <label class="field">
        <span class="label">
          Body
          <em :class="{ over: bodyWords > rules.bodyMaxWords }">{{ bodyWords }} / {{ rules.bodyMaxWords }} words</em>
        </span>
        <textarea v-model="slide.body" rows="6" />
      </label>
      <p class="hint">Wrap words in <code>*asterisks*</code> to draw them in the accent colour.</p>

      <label class="field">
        <span class="label">Claim flag <em>adds a badge to the slide</em></span>
        <select v-model="slide.flag">
          <option v-for="(label, key) in FLAGS" :key="key" :value="key">{{ label }}</option>
        </select>
      </label>

      <ul v-if="warnings.length" class="warnings">
        <li v-for="w in warnings" :key="w">{{ w }}</li>
      </ul>
    </section>

    <section class="group">
      <h3>Image</h3>
      <div class="image-meta">
        <p class="image-title">{{ slide.image?.title || 'No image' }}</p>
        <p v-if="slide.image?.credit" class="muted">{{ slide.image.credit }}</p>
        <p v-if="slide.image?.licence" class="muted">{{ slide.image.licence }}</p>
        <a v-if="slide.image?.sourceUrl" :href="slide.image.sourceUrl" target="_blank" rel="noopener">Source ↗</a>
      </div>
      <button class="btn primary" @click="pickerOpen = true">Search images…</button>
      <ImagePicker
        v-if="pickerOpen"
        :initial-query="slide.imageQuery || draft.topic"
        :initial-source="slide.imageSource || pickerSource"
        @pick="onPick"
        @close="pickerOpen = false"
      />
      <div class="row">
        <button class="btn" @click="usePlaceholder">New placeholder</button>
        <button class="btn" @click="fileInput.click()">Upload…</button>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile" />
      </div>

      <template v-if="slide.image">
        <label class="field slider">
          <span class="label">Horizontal focus <em>{{ Math.round(slide.image.focusX * 100) }}%</em></span>
          <input v-model.number="slide.image.focusX" type="range" min="0" max="1" step="0.01" />
        </label>
        <label class="field slider">
          <span class="label">Vertical focus <em>{{ Math.round(slide.image.focusY * 100) }}%</em></span>
          <input v-model.number="slide.image.focusY" type="range" min="0" max="1" step="0.01" />
        </label>
        <label class="field slider">
          <span class="label">Zoom <em>{{ slide.image.zoom.toFixed(2) }}×</em></span>
          <input v-model.number="slide.image.zoom" type="range" min="1" max="3" step="0.05" />
        </label>
      </template>
    </section>
  </div>
</template>

<style scoped>
.regen {
  display: grid;
  gap: 8px;
  padding-bottom: 4px;
}
.error {
  margin: 0;
  font-size: 12.5px;
  color: var(--danger);
}
.group {
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
  display: grid;
  gap: 12px;
}
.group:last-child {
  border-bottom: 0;
}
h3 {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 600;
}
.seg {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 3px;
  gap: 3px;
}
.seg button {
  all: unset;
  text-align: center;
  padding: 7px 0;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
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
.hint {
  margin: -4px 0 0;
  font-size: 12px;
  color: var(--muted);
}
.warnings {
  margin: 0;
  padding: 10px 12px 10px 28px;
  border-radius: 8px;
  background: rgba(232, 163, 61, 0.08);
  border: 1px solid rgba(232, 163, 61, 0.3);
  color: var(--warn);
  font-size: 12.5px;
  display: grid;
  gap: 4px;
}
.image-meta p {
  margin: 0 0 2px;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.image-meta a {
  font-size: 13px;
  color: var(--accent);
}
.image-title {
  font-weight: 600;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
</style>

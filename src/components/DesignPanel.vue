<script setup>
import { computed, ref } from 'vue'
import { FONTS, STYLES, VARIATIONS, resolveDesign } from '../config/styles'
import { THEME_KEYS, THEME_LABELS, normaliseHex, themeColours } from '../config/themes'
import {
  allThemes,
  applyTheme,
  deleteTheme,
  draft,
  findTheme,
  renameTheme,
  saveThemeAs,
  setDesign,
  settings,
  themeModified,
  updateTheme,
} from '../store'
import SlideCanvas from './SlideCanvas.vue'

const props = defineProps({
  slide: { type: Object, required: true },
  index: { type: Number, required: true },
})

const current = computed(() => resolveDesign(draft))

const presets = computed(() => allThemes().filter((t) => t.preset))
const saved = computed(() => allThemes().filter((t) => !t.preset))
const source = computed(() => findTheme(settings.themeId))
const modified = computed(() => themeModified())
const sourceIsSaved = computed(() => source.value && !source.value.preset)

const naming = ref(false)
const newName = ref('')
const renamingId = ref('')
const renameText = ref('')

function setColour(key, value) {
  const hex = normaliseHex(value)
  if (hex) settings.theme[key] = hex
}

function startSave() {
  newName.value = source.value && !modified.value ? `${source.value.name} copy` : ''
  naming.value = true
}

function confirmSave() {
  saveThemeAs(newName.value)
  naming.value = false
}

function revert() {
  if (source.value) settings.theme = themeColours(source.value)
}

function startRename(t) {
  renamingId.value = t.id
  renameText.value = t.name
}

function confirmRename() {
  renameTheme(renamingId.value, renameText.value)
  renamingId.value = ''
}

function remove(t) {
  if (window.confirm(`Delete the colour scheme "${t.name}"?`)) deleteTheme(t.id)
}
</script>

<template>
  <div class="design">
    <section class="group">
      <h3>Post design <em>this post · new posts use your last picks</em></h3>

      <h4>Style <span class="muted">layout</span></h4>
      <div class="cards">
        <button
          v-for="(item, id) in STYLES"
          :key="id"
          class="card"
          :class="{ on: current.style === id }"
          :aria-pressed="current.style === id"
          @click="setDesign('style', id)"
        >
          <SlideCanvas :slide="props.slide" :index="props.index" :total="draft.slides.length" :design="{ style: id }" />
          <span class="card-name">{{ item.name }}</span>
          <span class="card-hint">{{ item.hint }}</span>
        </button>
      </div>

      <h4>Variation <span class="muted">overlay and photo look</span></h4>
      <div class="cards">
        <button
          v-for="(item, id) in VARIATIONS"
          :key="id"
          class="card"
          :class="{ on: current.variation === id }"
          :aria-pressed="current.variation === id"
          @click="setDesign('variation', id)"
        >
          <SlideCanvas :slide="props.slide" :index="props.index" :total="draft.slides.length" :design="{ variation: id }" />
          <span class="card-name">{{ item.name }}</span>
          <span class="card-hint">{{ item.hint }}</span>
        </button>
      </div>

      <h4>Font</h4>
      <div class="fonts">
        <button
          v-for="(item, id) in FONTS"
          :key="id"
          class="font-card"
          :class="{ on: current.font === id }"
          :aria-pressed="current.font === id"
          @click="setDesign('font', id)"
        >
          <span
            class="font-sample"
            :style="{
              fontFamily: `'${item.display.family}'`,
              fontWeight: item.display.weight,
              textTransform: item.display.uppercase ? 'uppercase' : 'none',
            }"
          >
            The signal
          </span>
          <span class="font-name">{{ item.name }}</span>
        </button>
      </div>
    </section>

    <section class="group">
      <h3>Colour scheme <em>all posts</em></h3>
      <div class="schemes">
        <button
          v-for="t in presets"
          :key="t.id"
          class="scheme"
          :class="{ on: settings.themeId === t.id && !modified }"
          :title="t.name"
          @click="applyTheme(t.id)"
        >
          <span class="chip" :style="{ background: t.bg, color: t.text }">
            Aa<i :style="{ background: t.accent }" />
          </span>
          <span class="scheme-name">{{ t.name }}</span>
        </button>
      </div>

      <template v-if="saved.length">
        <h4>Saved</h4>
        <ul class="saved">
          <li v-for="t in saved" :key="t.id" :class="{ on: settings.themeId === t.id }">
            <button class="saved-pick" :title="`Use ${t.name}`" @click="applyTheme(t.id)">
              <span class="chip small" :style="{ background: t.bg, color: t.text }">
                Aa<i :style="{ background: t.accent }" />
              </span>
            </button>
            <form v-if="renamingId === t.id" class="rename" @submit.prevent="confirmRename">
              <input v-model="renameText" maxlength="40" aria-label="Scheme name" @keydown.esc="renamingId = ''" />
              <button class="btn">Save</button>
            </form>
            <template v-else>
              <button class="saved-name" @click="applyTheme(t.id)">
                {{ t.name }}<span v-if="settings.themeId === t.id && modified" class="dirty"> · edited</span>
              </button>
              <button class="icon-btn" title="Rename" aria-label="Rename" @click="startRename(t)">✎</button>
              <button class="icon-btn danger" title="Delete" aria-label="Delete" @click="remove(t)">✕</button>
            </template>
          </li>
        </ul>
      </template>

      <h4>
        Customise
        <span class="muted">{{ source ? `from ${source.name}` : 'unsaved' }}{{ source && modified ? ' · edited' : '' }}</span>
      </h4>
      <div class="colours">
        <label v-for="key in THEME_KEYS" :key="key" class="colour">
          <input type="color" :value="settings.theme[key]" @input="setColour(key, $event.target.value)" />
          <span class="colour-label">{{ THEME_LABELS[key] }}</span>
          <input
            class="hex"
            :value="settings.theme[key]"
            spellcheck="false"
            maxlength="7"
            :aria-label="`${THEME_LABELS[key]} hex`"
            @change="setColour(key, $event.target.value)"
          />
        </label>
      </div>

      <form v-if="naming" class="name-row" @submit.prevent="confirmSave">
        <input v-model="newName" placeholder="Scheme name" maxlength="40" aria-label="New scheme name" @keydown.esc="naming = false" />
        <button class="btn primary">Save</button>
        <button type="button" class="btn" @click="naming = false">Cancel</button>
      </form>
      <div v-else class="actions">
        <button class="btn" @click="startSave">Save as new scheme</button>
        <button v-if="sourceIsSaved && modified" class="btn" @click="updateTheme">Update "{{ source.name }}"</button>
        <button v-if="source && modified" class="btn" @click="revert">Revert</button>
      </div>
      <p class="hint">Accent colours highlighted *words*, rules and arrows. Photo tint colours the shadows of every photo.</p>
    </section>
  </div>
</template>

<style scoped>
.group {
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
  display: grid;
  gap: 12px;
}
.group:last-child {
  border-bottom: 0;
}
h3,
h4 {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
h3 em,
h4 .muted {
  font-style: normal;
  letter-spacing: 0;
  text-transform: none;
  font-weight: 400;
  text-align: right;
}
h4 {
  margin-top: 4px;
}
button {
  font: inherit;
  color: inherit;
}

/* post design */
.cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.card {
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: grid;
  gap: 3px;
  padding: 6px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--surface-2);
}
.card:hover,
.card:focus-visible,
.font-card:hover,
.font-card:focus-visible {
  border-color: var(--line-strong);
}
.card.on,
.font-card.on {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.card :deep(.slide-canvas) {
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}
.card-name {
  font-size: 13px;
  font-weight: 600;
}
.card-hint {
  font-size: 11.5px;
  color: var(--muted);
  line-height: 1.35;
}

.fonts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.font-card {
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--surface-2);
}
.font-sample {
  font-size: 24px;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.font-name {
  font-size: 11.5px;
  color: var(--muted);
}

/* colour schemes */
.schemes {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.scheme {
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: grid;
  gap: 5px;
  justify-items: center;
  padding: 6px 4px;
  border-radius: 8px;
  border: 1px solid transparent;
}
.scheme:hover,
.scheme:focus-visible {
  background: var(--surface-2);
}
.scheme.on {
  border-color: var(--accent);
  background: var(--surface-2);
}
.scheme-name {
  font-size: 11px;
  text-align: center;
  line-height: 1.2;
}
.chip {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  max-width: 56px;
  border-radius: 5px;
  display: flex;
  align-items: flex-end;
  padding: 6px;
  box-sizing: border-box;
  font-family: Anton, Impact, sans-serif;
  font-size: 17px;
  line-height: 1;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}
.chip i {
  position: absolute;
  left: 6px;
  top: 8px;
  width: 16px;
  height: 3px;
  border-radius: 2px;
}
.chip.small {
  width: 28px;
  aspect-ratio: 1;
  font-size: 11px;
  padding: 3px 4px;
}
.chip.small i {
  left: 4px;
  top: 5px;
  width: 10px;
  height: 2px;
}
.saved {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.saved li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 8px;
  border: 1px solid transparent;
}
.saved li.on {
  border-color: var(--accent);
  background: var(--surface-2);
}
.saved-pick,
.saved-name,
.icon-btn {
  all: unset;
  cursor: pointer;
}
.saved-name {
  flex: 1;
  font-size: 13px;
}
.dirty {
  color: var(--warn);
  font-size: 12px;
}
.icon-btn {
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--muted);
  font-size: 13px;
}
.icon-btn:hover,
.icon-btn:focus-visible {
  color: var(--text);
  background: var(--surface-3);
}
.icon-btn.danger:hover {
  color: var(--danger);
}
.rename {
  flex: 1;
  display: flex;
  gap: 6px;
}
.rename input {
  padding: 4px 8px;
}
.rename .btn {
  padding: 4px 10px;
}

.colours {
  display: grid;
  gap: 6px;
}
.colour {
  display: grid;
  grid-template-columns: 34px 1fr 92px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.colour input[type='color'] {
  width: 34px;
  height: 28px;
  padding: 2px;
  cursor: pointer;
}
.hex {
  padding: 5px 8px;
  font-family: ui-monospace, monospace;
  font-size: 12.5px;
}
.actions,
.name-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.name-row input {
  flex: 1;
  min-width: 120px;
}
.actions .btn,
.name-row .btn {
  padding: 6px 10px;
}
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}
</style>

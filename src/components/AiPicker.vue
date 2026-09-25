<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { EFFORTS, LENGTHS, MODELS, PROVIDERS, settings, ui } from '../store'

const open = ref(false)
const showMore = ref(false)
const root = ref(null)

const effortKeys = Object.keys(EFFORTS)
const isPro = computed(() => settings.provider === 'pro')
const model = computed(() => MODELS[settings.model] || MODELS['claude-sonnet-5'])

// The API key only offers the models with a cost estimate; Claude Pro offers them all.
const available = computed(() => Object.entries(MODELS).filter(([, m]) => isPro.value || m.api))
const mainModels = computed(() => available.value.filter(([, m]) => !m.more))
const moreModels = computed(() => available.value.filter(([, m]) => m.more))

const effortIndex = computed({
  get: () => Math.max(0, effortKeys.indexOf(settings.effort)),
  set: (i) => (settings.effort = effortKeys[i]),
})

const buttonLabel = computed(() =>
  isPro.value ? `${model.value.name} · ${EFFORTS[settings.effort] || 'Low'}` : `${model.value.name} · API`,
)

function setProvider(p) {
  settings.provider = p
  // Switching to the API: fall back to Sonnet 5 if the chosen model is Pro-only.
  if (p === 'api' && !MODELS[settings.model]?.api) settings.model = 'claude-sonnet-5'
}

function pick(id) {
  settings.model = id
}

function onDocClick(e) {
  if (open.value && root.value && !root.value.contains(e.target)) open.value = false
}
function onKey(e) {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => {
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onKey)
  // Keep "More models" open if an older model is already selected.
  showMore.value = !!model.value.more
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="root" class="picker">
    <button
      type="button"
      class="btn trigger"
      :class="{ pro: isPro }"
      :disabled="ui.busy"
      :aria-expanded="open"
      aria-haspopup="dialog"
      title="AI provider, model and effort"
      @click="open = !open"
    >
      <span class="dot" />
      {{ buttonLabel }}
      <span class="chev">▾</span>
    </button>

    <div v-if="open" class="pop" role="dialog" aria-label="AI settings">
      <div class="seg" role="radiogroup" aria-label="Provider">
        <button
          v-for="(label, p) in PROVIDERS"
          :key="p"
          type="button"
          role="radio"
          :aria-checked="settings.provider === p"
          :class="{ on: settings.provider === p }"
          @click="setProvider(p)"
        >
          {{ label }}
        </button>
      </div>
      <p class="hint">
        {{
          isPro
            ? 'Runs on your Claude Pro plan through the local Claude CLI. No API cost; counts toward your plan limits.'
            : 'Uses the API key in .env. Pay per post.'
        }}
      </p>

      <ul class="models" role="listbox" aria-label="Model">
        <li v-for="[id, m] in mainModels" :key="id">
          <button type="button" role="option" :aria-selected="settings.model === id" :class="{ on: settings.model === id }" @click="pick(id)">
            <span class="name">{{ m.name }}</span>
            <span class="note">{{ isPro ? m.note : m.api }}</span>
            <span v-if="isPro && m.credits" class="tag">Needs usage credits</span>
            <span v-if="settings.model === id" class="check">✓</span>
          </button>
        </li>
        <template v-if="moreModels.length">
          <li>
            <button type="button" class="more-toggle" @click="showMore = !showMore">
              {{ showMore ? '▾' : '▸' }} More models
            </button>
          </li>
          <template v-if="showMore">
            <li v-for="[id, m] in moreModels" :key="id">
              <button type="button" role="option" :aria-selected="settings.model === id" :class="{ on: settings.model === id }" @click="pick(id)">
                <span class="name">{{ m.name }}</span>
                <span v-if="m.credits" class="tag">Needs usage credits</span>
                <span v-if="settings.model === id" class="check">✓</span>
              </button>
            </li>
          </template>
        </template>
      </ul>

      <div class="length">
        <div class="effort-head">
          <span>Post length</span>
          <strong>{{ LENGTHS[settings.length]?.range }} slides</strong>
        </div>
        <div class="seg four" role="radiogroup" aria-label="Post length">
          <button
            v-for="(l, key) in LENGTHS"
            :key="key"
            type="button"
            role="radio"
            :aria-checked="settings.length === key"
            :class="{ on: settings.length === key }"
            @click="settings.length = key"
          >
            {{ l.name }}
          </button>
        </div>
        <p class="hint">Auto lets Claude pick what the story needs. Longer posts take longer{{ isPro ? '' : ' and cost more' }}.</p>
      </div>

      <div class="effort" :class="{ off: !isPro }">
        <div class="effort-head">
          <span>Effort</span>
          <strong>{{ isPro ? EFFORTS[settings.effort] : 'Fixed (fast)' }}</strong>
        </div>
        <input
          v-model.number="effortIndex"
          type="range"
          min="0"
          :max="effortKeys.length - 1"
          step="1"
          :disabled="!isPro"
          aria-label="Effort, faster to smarter"
          :aria-valuetext="EFFORTS[settings.effort]"
        />
        <div class="ends"><span>Faster</span><span>Smarter</span></div>
        <p class="hint">
          {{
            isPro
              ? 'Higher effort thinks longer: better on tricky facts, but slower (up to several minutes) and uses more of your limit.'
              : 'Effort is a Claude Pro option. API calls stay fast to keep costs low.'
          }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.picker {
  position: relative;
  flex-shrink: 0;
}
.trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted);
}
.trigger.pro .dot {
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}
.chev {
  opacity: 0.6;
  font-size: 11px;
}
.pop {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  width: 320px;
  padding: 12px;
  display: grid;
  gap: 10px;
  background: var(--surface-2);
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
}
.seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  padding: 3px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.seg button,
.models button {
  all: unset;
  cursor: pointer;
  box-sizing: border-box;
}
.seg button {
  text-align: center;
  padding: 6px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--muted);
}
.seg button.on {
  color: var(--text);
  background: var(--surface-3);
  box-shadow: inset 0 0 0 1px var(--line-strong);
}
.seg.four {
  grid-template-columns: repeat(4, 1fr);
}
.length {
  display: grid;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}
.hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
}
.models {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
  max-height: 300px;
  overflow-y: auto;
}
.models button {
  width: 100%;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 7px 9px;
  border-radius: 6px;
  font-size: 13px;
}
.models button:hover,
.models button:focus-visible,
.seg button:focus-visible {
  background: var(--surface-3);
}
.models button.on {
  background: var(--surface-3);
  box-shadow: inset 0 0 0 1px var(--line-strong);
}
.name {
  font-weight: 600;
  white-space: nowrap;
}
.note {
  color: var(--muted);
  font-size: 12px;
}
.tag {
  font-size: 10.5px;
  color: var(--warn);
  border: 1px solid color-mix(in srgb, var(--warn) 40%, transparent);
  border-radius: 4px;
  padding: 0 5px;
  white-space: nowrap;
}
.check {
  margin-left: auto;
  color: var(--accent);
}
.more-toggle {
  color: var(--muted);
  font-size: 12.5px !important;
}
.effort {
  display: grid;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}
.effort.off .effort-head,
.effort.off input,
.effort.off .ends {
  opacity: 0.45;
}
.effort-head {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}
.effort-head strong {
  color: var(--accent);
  font-weight: 600;
}
.effort input {
  width: 100%;
}
.ends {
  display: flex;
  justify-content: space-between;
  font-size: 11.5px;
  color: var(--muted);
}
</style>

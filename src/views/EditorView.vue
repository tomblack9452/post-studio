<script setup>
import { computed, ref, watch } from 'vue'
import { draft, library, setStatus, settings, ui } from '../store'
import { exportIssues, exportPostZip, exportSinglePng } from '../services/exporter'
import { draftWarnings } from '../services/validate'
import CaptionPanel from '../components/CaptionPanel.vue'
import DesignPanel from '../components/DesignPanel.vue'
import SlideCanvas from '../components/SlideCanvas.vue'
import SlideEditor from '../components/SlideEditor.vue'
import SlideStrip from '../components/SlideStrip.vue'

const selected = ref(0)
const slide = computed(() => draft.slides[selected.value])
const postWarnings = computed(() => draftWarnings(draft))

const saveLabel = computed(() => {
  if (draft.demo) return 'Sample · not saved'
  if (draft.status === 'posted' && draft.postedAt) {
    return `Posted ${new Date(draft.postedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
  }
  return { saving: 'Saving…', saved: 'Saved', error: 'Not saved!' }[library.saveState] || 'Saved'
})

const exporting = ref('')
const exportError = ref('')

function dismissErrors() {
  ui.error = ''
  exportError.value = ''
}

async function runExport(kind) {
  exportError.value = ''
  if (kind === 'zip') {
    const issues = exportIssues(draft)
    if (issues.length && !window.confirm(`${issues.join('\n')}\n\nExport anyway?`)) return
  }
  exporting.value = kind === 'zip' ? 'Preparing…' : 'Rendering…'
  try {
    if (kind === 'zip') await exportPostZip(draft, settings, (s) => (exporting.value = s))
    else await exportSinglePng(draft, selected.value, settings)
  } catch (e) {
    exportError.value = e.message
  } finally {
    exporting.value = ''
  }
}

// A new draft replaced the old one: start at its first slide.
watch(
  () => draft.id,
  () => {
    selected.value = 0
    if (ui.panel === 'caption') ui.panel = 'slide'
  },
)
</script>

<template>
  <main class="editor">
    <SlideStrip v-model:selected="selected" :slides="draft.slides" />

    <section class="stage">
      <div class="stage-head">
        <input v-model="draft.topic" class="topic-input" placeholder="Topic" aria-label="Topic" />
        <span class="muted save-state" :title="draft.demo ? 'Edit the sample post to start saving it' : ''">
          {{ saveLabel }}
        </span>
        <select
          class="status"
          :class="draft.status"
          :value="draft.status"
          aria-label="Post status"
          @change="setStatus($event.target.value)"
        >
          <option value="draft">Draft</option>
          <option value="ready">Ready to post</option>
          <option value="posted">Posted</option>
        </select>
        <div class="actions">
          <button class="btn" :disabled="!!exporting || ui.busy" title="Download this slide as PNG" @click="runExport('png')">
            PNG
          </button>
          <button class="btn primary" :disabled="!!exporting || ui.busy" @click="runExport('zip')">
            {{ exporting || 'Export post (.zip)' }}
          </button>
        </div>
      </div>

      <div v-if="ui.busy || ui.error || exportError" class="banner" :class="{ error: ui.error || exportError }" role="status">
        <span v-if="ui.busy" class="spinner" />
        {{ ui.error || exportError || ui.status }}
        <button v-if="ui.error || exportError" class="link" @click="dismissErrors">Dismiss</button>
      </div>

      <div class="stage-canvas">
        <SlideCanvas v-if="slide" :key="slide.id" :slide="slide" :index="selected" :total="draft.slides.length" />
      </div>

      <p v-if="postWarnings.length || ui.warnings.length" class="post-warnings">
        {{ [...postWarnings, ...ui.warnings].join(' · ') }}
      </p>
      <p v-if="ui.lastUsage" class="usage muted">
        Last AI call: {{ ui.lastUsage.model }}{{ ui.lastUsage.provider === 'pro' ? ` via Claude Pro (${ui.lastUsage.effort || 'low'} effort)` : '' }} · {{ ui.lastUsage.inputTokens.toLocaleString() }} in /
        {{ ui.lastUsage.outputTokens.toLocaleString() }} out
        <template v-if="ui.lastUsage.costUsd != null"> · ≈ ${{ ui.lastUsage.costUsd.toFixed(4) }}</template>
      </p>
    </section>

    <aside class="panel">
      <nav class="tabs">
        <button :class="{ on: ui.panel === 'slide' }" @click="ui.panel = 'slide'">Slide</button>
        <button :class="{ on: ui.panel === 'design' }" @click="ui.panel = 'design'">Design</button>
        <button :class="{ on: ui.panel === 'caption' }" @click="ui.panel = 'caption'">
          Caption & tags
          <span v-if="draft.factCheck?.length" class="dot" title="Has facts to check" />
        </button>
      </nav>
      <SlideEditor v-if="ui.panel === 'slide' && slide" :slide="slide" :index="selected" />
      <DesignPanel v-else-if="ui.panel === 'design' && slide" :slide="slide" :index="selected" />
      <CaptionPanel v-else-if="ui.panel === 'caption'" />
    </aside>
  </main>
</template>

<style scoped>
.editor {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 188px minmax(0, 1fr) 360px;
}
.stage {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 24px;
  gap: 12px;
}
.stage-head {
  width: 100%;
  max-width: 760px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.topic-input {
  all: unset;
  font-size: 18px;
  font-weight: 600;
  min-width: 0;
  flex: 1;
  border-bottom: 1px solid transparent;
}
.topic-input:hover,
.topic-input:focus {
  border-bottom-color: var(--line-strong);
}
.stage-head .muted {
  font-size: 12px;
  white-space: nowrap;
}
.actions {
  display: flex;
  gap: 6px;
}
.save-state {
  min-width: 70px;
  text-align: right;
}
.status {
  width: auto;
  padding: 5px 8px;
  font-size: 13px;
}
.status.ready {
  border-color: var(--accent);
  color: var(--accent);
}
.status.posted {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent);
  font-weight: 600;
}
.actions .btn {
  padding: 6px 12px;
  white-space: nowrap;
}
.banner {
  width: 100%;
  max-width: 640px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  background: var(--surface-2);
  border: 1px solid var(--line-strong);
}
.banner.error {
  border-color: var(--danger);
  color: var(--danger);
}
.link {
  all: unset;
  cursor: pointer;
  margin-left: auto;
  text-decoration: underline;
}
.spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--line-strong);
  border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.stage-canvas {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  justify-content: center;
}
.stage-canvas > * {
  height: 100%;
  width: auto;
  max-width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
.post-warnings,
.usage {
  margin: 0;
  font-size: 12.5px;
  text-align: center;
  max-width: 640px;
}
.post-warnings {
  color: var(--warn);
}
.panel {
  overflow-y: auto;
  border-left: 1px solid var(--line);
  padding: 0 18px 24px;
  min-height: 0;
}
.tabs {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--bg);
  display: flex;
  gap: 4px;
  padding: 12px 0 10px;
  border-bottom: 1px solid var(--line);
}
.tabs button {
  all: unset;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
}
.tabs button.on {
  color: var(--text);
  background: var(--surface-3);
  box-shadow: inset 0 0 0 1px var(--line-strong);
}
.tabs button:focus-visible {
  outline: 2px solid var(--accent);
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--warn);
}

@media (max-width: 980px) {
  .editor {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
  .stage-canvas > * {
    height: auto;
    width: 100%;
  }
}
</style>

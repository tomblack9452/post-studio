<script setup>
import { computed } from 'vue'
import { ACCENTS } from './config/brand'
import { library, settings, ui } from './store'
import GenerateBar from './components/GenerateBar.vue'
import DraftsView from './views/DraftsView.vue'
import EditorView from './views/EditorView.vue'

const accentHex = computed(() => (ACCENTS[settings.accent] || ACCENTS.cyan).hex)
</script>

<template>
  <div class="app" :style="{ '--accent': accentHex }">
    <header class="topbar">
      <div class="brand">
        <span class="mark" />
        Post Studio
      </div>
      <nav class="views">
        <button :class="{ on: ui.view === 'editor' }" @click="ui.view = 'editor'">Editor</button>
        <button :class="{ on: ui.view === 'drafts' }" @click="ui.view = 'drafts'">
          Drafts <span class="count">{{ library.items.length }}</span>
        </button>
      </nav>
      <GenerateBar />
      <div class="settings">
        <label class="inline">
          <span class="muted">Handle</span>
          <input v-model.trim="settings.handle" spellcheck="false" />
        </label>
        <div class="swatches" role="radiogroup" aria-label="Accent colour">
          <button
            v-for="(a, key) in ACCENTS"
            :key="key"
            role="radio"
            :aria-checked="settings.accent === key"
            :class="{ active: settings.accent === key }"
            :style="{ '--c': a.hex }"
            :title="a.name"
            @click="settings.accent = key"
          />
        </div>
      </div>
    </header>
    <EditorView v-if="ui.view === 'editor'" />
    <DraftsView v-else />
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  height: 56px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.brand {
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.mark {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent);
}
.views {
  display: flex;
  gap: 2px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 3px;
}
.views button {
  all: unset;
  cursor: pointer;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--muted);
  white-space: nowrap;
}
.views button.on {
  color: var(--text);
  background: var(--surface-3);
  box-shadow: inset 0 0 0 1px var(--line-strong);
}
.views button:focus-visible {
  outline: 2px solid var(--accent);
}
.views .count {
  opacity: 0.6;
}
.settings {
  display: flex;
  align-items: center;
  gap: 18px;
}
.inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.inline input {
  width: 140px;
  padding: 6px 10px;
}
.swatches {
  display: flex;
  gap: 8px;
}
.swatches button {
  all: unset;
  cursor: pointer;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--c);
  box-shadow: 0 0 0 2px var(--bg), 0 0 0 3px transparent;
}
.swatches button.active {
  box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--c);
}
.swatches button:focus-visible {
  box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--text);
}
</style>

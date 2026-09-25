<script setup>
import { computed, watch } from 'vue'
import { inkOn, uiAccent } from './config/themes'
import { setFavicon } from './services/favicon'
import { library, settings, ui } from './store'
import GenerateBar from './components/GenerateBar.vue'
import DraftsView from './views/DraftsView.vue'
import EditorView from './views/EditorView.vue'

const accentHex = computed(() => settings.theme.accent)
const uiStyle = computed(() => {
  const accent = uiAccent(accentHex.value)
  return { '--accent': accent, '--on-accent': inkOn(accent) }
})

// The tab icon is the logo dot, so it follows the accent colour too.
watch(accentHex, setFavicon, { immediate: true })

function openDesign() {
  ui.view = 'editor'
  ui.panel = 'design'
}
</script>

<template>
  <div class="app" :style="uiStyle">
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
        <button
          class="scheme"
          :style="{ '--bg': settings.theme.bg, '--scheme-accent': settings.theme.accent }"
          title="Colour scheme and post style"
          aria-label="Colour scheme and post style"
          @click="openDesign"
        />
        <label class="inline">
          <span class="muted wide-only">Handle</span>
          <input v-model.trim="settings.handle" spellcheck="false" aria-label="Handle" title="Your Instagram handle" />
        </label>
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
.scheme {
  all: unset;
  cursor: pointer;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--bg) 0 50%, var(--scheme-accent) 50% 100%);
  box-shadow: 0 0 0 1px var(--line-strong);
}
.scheme:hover,
.scheme:focus-visible {
  box-shadow: 0 0 0 2px var(--accent);
}
.inline input {
  width: 120px;
  padding: 6px 10px;
}
@media (max-width: 1360px) {
  .wide-only {
    display: none;
  }
}
</style>

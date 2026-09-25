<script setup>
import { ref } from 'vue'
import { CATEGORY_LABELS, randomTopic } from '../data/topics'
import { generate, library, settings, ui } from '../store'
import AiPicker from './AiPicker.vue'

const topic = ref('')
const category = ref('')

function random() {
  const lock = settings.lockCategory && category.value
  const t = randomTopic({
    exclude: topic.value,
    category: lock ? category.value : '',
    used: library.items.map((d) => d.topic || ''),
  })
  topic.value = t.title
  category.value = t.category
}

function run() {
  if (!topic.value.trim() || ui.busy) return
  // The current post is already autosaved, so a new one can simply replace it in the editor.
  generate({ topic: topic.value.trim(), category: category.value })
}
</script>

<template>
  <form class="gen" @submit.prevent="run">
    <input
      v-model="topic"
      class="topic"
      placeholder="Topic, e.g. Dyatlov Pass"
      aria-label="Topic"
      :disabled="ui.busy"
    />
    <button
      type="button"
      class="btn"
      :disabled="ui.busy"
      :title="settings.lockCategory && category ? `Random ${CATEGORY_LABELS[category]} topic` : 'Pick a random topic'"
      @click="random"
    >
      🎲<span class="wide-only"> Random</span>
    </button>
    <select v-model="category" aria-label="Category" :disabled="ui.busy">
      <option value="">Auto category</option>
      <option v-for="(label, key) in CATEGORY_LABELS" :key="key" :value="key">{{ label }}</option>
    </select>
    <label
      class="lock"
      :class="{ off: !category }"
      :title="category ? 'Random only picks topics from this category' : 'Choose a category first'"
    >
      <input v-model="settings.lockCategory" type="checkbox" :disabled="ui.busy || !category" />
      Only this category
    </label>
    <AiPicker />
    <button class="btn primary" :disabled="ui.busy || !topic.trim()">
      {{ ui.busy ? 'Working…' : 'Generate' }}
    </button>
  </form>
</template>

<style scoped>
.gen {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 1100px;
  min-width: 0;
}
.topic {
  flex: 1;
  min-width: 150px;
}
select {
  width: auto;
  min-width: 110px;
  max-width: 220px;
  flex-shrink: 1;
}
.btn {
  white-space: nowrap;
}
.lock {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  white-space: nowrap;
  cursor: pointer;
}
.lock input {
  width: auto;
  margin: 0;
  accent-color: var(--accent);
}
.lock.off {
  opacity: 0.45;
  cursor: default;
}
@media (max-width: 1360px) {
  .wide-only {
    display: none;
  }
}
</style>

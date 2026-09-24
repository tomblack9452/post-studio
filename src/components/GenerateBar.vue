<script setup>
import { ref } from 'vue'
import { CATEGORY_LABELS, randomTopic } from '../data/topics'
import { generate, MODELS, settings, ui } from '../store'

const topic = ref('')
const category = ref('')

function random() {
  const t = randomTopic(topic.value)
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
    <button type="button" class="btn" :disabled="ui.busy" title="Pick a random topic" @click="random">🎲 Random</button>
    <select v-model="category" aria-label="Category" :disabled="ui.busy">
      <option value="">Auto category</option>
      <option v-for="(label, key) in CATEGORY_LABELS" :key="key" :value="key">{{ label }}</option>
    </select>
    <select v-model="settings.model" aria-label="Model" :disabled="ui.busy">
      <option v-for="(label, id) in MODELS" :key="id" :value="id">{{ label }}</option>
    </select>
    <button class="btn primary" :disabled="ui.busy || !topic.trim()">
      {{ ui.busy ? 'Working…' : 'Generate' }}
    </button>
  </form>
</template>

<style scoped>
.gen {
  display: flex;
  gap: 8px;
  flex: 1;
  max-width: 980px;
  min-width: 0;
}
.topic {
  flex: 1;
  min-width: 140px;
}
select {
  width: auto;
  max-width: 220px;
}
.btn {
  white-space: nowrap;
}
</style>

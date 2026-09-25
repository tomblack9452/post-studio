<script setup>
import { SLIDE_TYPES } from '../config/brand'
import { MAX_SLIDES } from '../config/brand'
import { addSlide, duplicateSlide, moveSlide, removeSlide } from '../store'
import { slideWarnings } from '../services/validate'
import SlideCanvas from './SlideCanvas.vue'

const props = defineProps({
  slides: { type: Array, required: true },
})
const selected = defineModel('selected', { type: Number, default: 0 })

const act = (fn, ...args) => (selected.value = fn(...args))
</script>

<template>
  <aside class="strip">
    <div class="strip-list">
      <button
        v-for="(slide, i) in props.slides"
        :key="slide.id"
        class="thumb"
        :class="{ active: i === selected }"
        @click="selected = i"
      >
        <SlideCanvas :slide="slide" :index="i" :total="props.slides.length" />
        <span class="thumb-label">
          <span>{{ i + 1 }} · {{ SLIDE_TYPES[slide.type]?.label }}</span>
          <span v-if="slideWarnings(slide).length" class="warn-dot" title="Has warnings" />
        </span>
      </button>
    </div>

    <div class="strip-actions">
      <div class="row">
        <button class="btn icon" title="Move up" :disabled="selected === 0" @click="act(moveSlide, selected, -1)">↑</button>
        <button
          class="btn icon"
          title="Move down"
          :disabled="selected === props.slides.length - 1"
          @click="act(moveSlide, selected, 1)"
        >
          ↓
        </button>
        <button
          class="btn icon"
          title="Duplicate"
          :disabled="props.slides.length >= MAX_SLIDES"
          @click="act(duplicateSlide, selected)"
        >
          ⧉
        </button>
        <button
          class="btn icon danger"
          title="Delete slide"
          :disabled="props.slides.length <= 1"
          @click="act(removeSlide, selected)"
        >
          ✕
        </button>
      </div>
      <button
        class="btn"
        :disabled="props.slides.length >= MAX_SLIDES"
        :title="props.slides.length >= MAX_SLIDES ? `Instagram allows ${MAX_SLIDES} slides` : ''"
        @click="act(addSlide, selected, 'story')"
      >
        + Add slide <span class="count">{{ props.slides.length }}/{{ MAX_SLIDES }}</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.count {
  opacity: 0.55;
  font-size: 12px;
  margin-left: 4px;
}
.strip {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--line);
}
.strip-list {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.thumb {
  all: unset;
  cursor: pointer;
  display: block;
  border-radius: 6px;
  outline: 2px solid transparent;
  outline-offset: 3px;
  transition: outline-color 0.15s;
}
.thumb:hover {
  outline-color: var(--line-strong);
}
.thumb.active {
  outline-color: var(--accent);
}
.thumb:focus-visible {
  outline-color: var(--accent);
}
.thumb-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
}
.warn-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--warn);
}
.strip-actions {
  padding: 12px 14px;
  border-top: 1px solid var(--line);
  display: grid;
  gap: 8px;
}
.row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
</style>

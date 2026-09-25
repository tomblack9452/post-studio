<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BRAND } from '../config/brand'
import { draft, settings } from '../store'
import { fontsReady } from '../render/fonts'
import { loadSlideImage } from '../render/images'
import { renderSlide } from '../render/slideRenderer'

const props = defineProps({
  slide: { type: Object, required: true },
  index: { type: Number, required: true },
  total: { type: Number, required: true },
  // Post style to preview; defaults to the open post's style.
  styleId: { type: String, default: '' },
})

const canvas = ref(null)
const error = ref('')
let frame = 0
let drawId = 0

// Coalesce rapid edits (typing, sliders) into one render per animation frame.
function scheduleDraw() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(draw)
}

async function draw() {
  const id = ++drawId
  await fontsReady
  let image = null
  error.value = ''
  try {
    image = await loadSlideImage(props.slide.image?.src)
  } catch (e) {
    error.value = e.message
  }
  if (id !== drawId || !canvas.value) return
  renderSlide(canvas.value, {
    slide: props.slide,
    index: props.index,
    total: props.total,
    settings,
    image,
    style: props.styleId || draft.style,
  })
}

onMounted(scheduleDraw)
onBeforeUnmount(() => cancelAnimationFrame(frame))
watch(
  () => [props.slide, props.index, props.total, props.styleId, draft.style, settings.theme, settings.handle],
  scheduleDraw,
  { deep: true },
)

defineExpose({ canvas })
</script>

<template>
  <div class="slide-canvas">
    <canvas ref="canvas" :width="BRAND.width" :height="BRAND.height" />
    <p v-if="error" class="canvas-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.slide-canvas {
  position: relative;
  aspect-ratio: 4 / 5;
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.canvas-error {
  position: absolute;
  inset: auto 8px 8px 8px;
  margin: 0;
  padding: 6px 8px;
  font-size: 12px;
  background: rgba(120, 20, 30, 0.85);
  color: #fff;
  border-radius: 4px;
}
</style>

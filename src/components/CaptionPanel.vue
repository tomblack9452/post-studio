<script setup>
import { computed, ref } from 'vue'
import { composeCaption, creditLine, IG_CAPTION_LIMIT } from '../services/exporter'
import { draft } from '../store'

const credits = computed(() => creditLine(draft))

const hashtagText = computed({
  get: () => draft.hashtags.join(' '),
  set: (v) => {
    draft.hashtags = v
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((h) => (h.startsWith('#') ? h : `#${h}`))
  },
})

const fullLength = computed(() => composeCaption(draft).length)
const copied = ref('')

async function copy(what) {
  const text = what === 'caption' ? draft.caption : what === 'tags' ? hashtagText.value : composeCaption(draft)
  try {
    await navigator.clipboard.writeText(text)
    copied.value = what
    setTimeout(() => (copied.value = ''), 1500)
  } catch {
    copied.value = ''
  }
}
</script>

<template>
  <div class="caption-panel">
    <section class="group">
      <label class="field">
        <span class="label">
          Caption
          <em :class="{ over: fullLength > IG_CAPTION_LIMIT }">{{ fullLength }} / {{ IG_CAPTION_LIMIT }} chars incl. tags</em>
        </span>
        <textarea v-model="draft.caption" rows="16" placeholder="Generate a post to get a caption." />
      </label>
      <p v-if="credits" class="hint">
        <strong>Added automatically</strong> (these licences require a credit): {{ credits }}
      </p>
      <button class="btn" @click="copy('caption')">{{ copied === 'caption' ? 'Copied' : 'Copy caption' }}</button>
    </section>

    <section class="group">
      <label class="field">
        <span class="label">
          Hashtags
          <em :class="{ over: draft.hashtags.length < 15 || draft.hashtags.length > 20 }">
            {{ draft.hashtags.length }} (aim for 15–20)
          </em>
        </span>
        <textarea v-model.lazy="hashtagText" rows="5" spellcheck="false" />
      </label>
      <div class="row">
        <button class="btn" @click="copy('tags')">{{ copied === 'tags' ? 'Copied' : 'Copy tags' }}</button>
        <button class="btn" @click="copy('all')" title="Caption + image credits + hashtags">
          {{ copied === 'all' ? 'Copied' : 'Copy all' }}
        </button>
      </div>
    </section>

    <section v-if="draft.factCheck?.length" class="group">
      <h3>Check before posting</h3>
      <ul class="facts">
        <li v-for="f in draft.factCheck" :key="f">{{ f }}</li>
      </ul>
      <p class="hint">
        The AI flagged these details as worth verifying. It can still get facts wrong that aren't listed, so read
        every slide against a reliable source.
      </p>
    </section>
  </div>
</template>

<style scoped>
.group {
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
  display: grid;
  gap: 10px;
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
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.facts {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  font-size: 13px;
  line-height: 1.45;
}
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}
</style>

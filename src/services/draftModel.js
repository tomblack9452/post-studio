// Shape of a draft and its slides. Everything here is plain JSON so it can be
// stored in IndexedDB and exported as-is.

export const uid = () => crypto.randomUUID()

export function placeholderImage(seed = Math.ceil(Math.random() * 9999)) {
  return {
    src: `placeholder:${seed}`,
    provider: 'placeholder',
    title: 'Placeholder',
    credit: '',
    licence: '',
    sourceUrl: '',
    focusX: 0.5,
    focusY: 0.5,
    zoom: 1,
  }
}

export function newSlide(type = 'story', patch = {}) {
  return {
    id: uid(),
    type, // 'hook' | 'story' | 'question'
    layout: type === 'story' ? 'split' : 'full', // 'full' | 'split'
    kicker: '',
    headline: '',
    body: '',
    flag: '', // '' | 'disputed' | 'unverified' | 'theory'
    imageQuery: '', // AI-suggested search words for this slide's picture
    imageSource: '', // 'wikimedia' | 'nasa' | 'apod'
    image: placeholderImage(),
    ...patch,
  }
}

export function newDraft(patch = {}) {
  const now = new Date().toISOString()
  return {
    id: uid(),
    topic: '',
    category: '',
    status: 'draft', // 'draft' | 'ready' | 'posted'
    // design: layout style, overlay variation and font (see config/styles.js)
    style: 'classic',
    variation: 'none',
    font: 'condensed',
    postedAt: null,
    createdAt: now,
    updatedAt: now,
    slides: [],
    caption: '',
    hashtags: [],
    factCheck: [], // details the AI flagged for checking before posting
    model: '',
    ...patch,
  }
}

import { BRAND } from '../config/brand'
import { fontsReady } from '../render/fonts'
import { loadSlideImage } from '../render/images'
import { renderSlide } from '../render/slideRenderer'

const THUMB_W = 216
const THUMB_H = 270

/** Small JPEG data URL of the first slide, stored with the draft for the drafts list. */
export async function makeThumbnail(draft, settings) {
  const slide = draft.slides[0]
  if (!slide) return ''
  await fontsReady
  const image = await loadSlideImage(slide.image?.src).catch(() => null)

  const full = document.createElement('canvas')
  full.width = BRAND.width
  full.height = BRAND.height
  renderSlide(full, { slide, index: 0, total: draft.slides.length, settings, image })

  const small = document.createElement('canvas')
  small.width = THUMB_W
  small.height = THUMB_H
  const ctx = small.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(full, 0, 0, THUMB_W, THUMB_H)
  return small.toDataURL('image/jpeg', 0.8)
}

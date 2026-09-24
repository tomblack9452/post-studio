import { newDraft, newSlide, placeholderImage } from '../services/draftModel'

// Hand-written sample post used to test the renderer before AI generation exists.
export function demoDraft() {
  return newDraft({
    demo: true, // not saved until you edit it
    topic: 'Wow! signal',
    category: 'space',
    slides: [
      newSlide('hook', {
        kicker: 'Unexplained · Deep space',
        headline: 'The signal that lasted *72 seconds*',
        image: placeholderImage(3),
      }),
      newSlide('story', {
        kicker: 'August 15, 1977 · Ohio',
        body: "The Big Ear radio telescope at Ohio State University was scanning the sky for signs of other civilisations. A computer printed what it heard as columns of numbers and letters.",
        image: placeholderImage(11),
      }),
      newSlide('story', {
        kicker: '6EQUJ5',
        body: 'Days later, volunteer astronomer Jerry Ehman read the printout. One sequence, 6EQUJ5, was far stronger than the background noise. He circled it and wrote one word in the margin: *Wow!*',
        image: placeholderImage(27),
      }),
      newSlide('story', {
        kicker: 'The frequency',
        body: 'It sat near 1420 MHz, the natural frequency of hydrogen, the most common element in the universe. Some scientists had argued this is exactly where another civilisation might choose to broadcast.',
        image: placeholderImage(42),
      }),
      newSlide('story', {
        kicker: 'Never again',
        body: "It lasted 72 seconds, about as long as the telescope's beam took to sweep past that patch of sky near Sagittarius. Astronomers have searched the same spot many times since. *It has never repeated.*",
        image: placeholderImage(58),
      }),
      newSlide('story', {
        kicker: 'The theories',
        flag: 'disputed',
        body: 'A 2017 paper blamed a passing comet; most astronomers rejected it. A 2024 proposal suggests a cold hydrogen cloud briefly brightened by a flare from a magnetar. *Neither is confirmed.*',
        image: placeholderImage(64),
      }),
      newSlide('question', {
        headline: 'So what *was* it?',
        body: 'Comet, cosmic cloud, or something else entirely? Tell us in the comments.',
        image: placeholderImage(3),
      }),
    ],
  })
}

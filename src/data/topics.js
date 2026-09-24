// Built-in topic list for "Random topic". Categories match the API's CATEGORIES.

export const CATEGORY_LABELS = {
  ghosts: 'Ghosts & hauntings',
  supernatural: 'Supernatural',
  cryptids: 'Cryptids',
  unsolved: 'Unsolved mysteries',
  space: 'Space',
  history: 'Weird history',
}

const list = {
  ghosts: [
    'Borley Rectory, "the most haunted house in England"',
    'The Enfield poltergeist',
    'The Amityville haunting',
    'The Brown Lady of Raynham Hall photograph',
    'Winchester Mystery House',
    'Eastern State Penitentiary hauntings',
    'Poveglia island, Venice',
    'The Myrtles Plantation',
    "Edinburgh's South Bridge Vaults",
    'The Tower of London ghost stories',
  ],
  supernatural: [
    'The Bell Witch of Tennessee',
    "The Devil's Footprints, Devon 1855",
    'Spring-heeled Jack',
    'The Hessdalen lights',
    'The Marfa lights',
    'The Rendlesham Forest incident',
    'Skinwalker Ranch',
    'The Black Dog of Bungay, 1577',
    'The Mad Gasser of Mattoon',
    'The Philadelphia Experiment legend',
  ],
  cryptids: [
    'The Loch Ness Monster and the Surgeon\'s Photograph',
    'The Patterson-Gimlin Bigfoot film',
    'The Yeti and the Shipton footprint',
    'The Mothman of Point Pleasant',
    'The Jersey Devil',
    'The Chupacabra',
    'Mokele-mbembe of the Congo basin',
    'Thylacine sightings after extinction',
    'The Flatwoods Monster',
    'The Owlman of Mawnan',
  ],
  unsolved: [
    'Dyatlov Pass incident',
    'The Mary Celeste',
    'The Voynich manuscript',
    'The Somerton Man (Tamam Shud case)',
    'The Isdal Woman',
    'The Lead Masks case, Brazil 1966',
    'The Oak Island money pit',
    'The Max Headroom broadcast intrusion',
    'Flight 19 and the Bermuda Triangle',
    'The lost colony of Roanoke',
    'The Sodder children disappearance',
    'The Hinterkaifeck farm murders',
  ],
  space: [
    'Wow! signal',
    "Tabby's Star (KIC 8462852)",
    "'Oumuamua, the interstellar visitor",
    'Fast radio bursts',
    'Rogue planets drifting without a star',
    'The Boötes Void',
    'The Great Attractor',
    'Planet Nine',
    "Przybylski's Star",
    'Odd radio circles (ORCs)',
    'The Black Knight satellite myth',
    'Lunar transient phenomena',
  ],
  history: [
    'Tunguska event',
    'The Dancing Plague of 1518',
    'The Green Children of Woolpit',
    'Kaspar Hauser',
    'The Tanganyika laughter epidemic',
    'The Carrington Event of 1859',
    'The Year Without a Summer, 1816',
    'The Antikythera mechanism',
    'The Great Molasses Flood',
    'The Radium Girls',
  ],
}

export const TOPICS = Object.entries(list).flatMap(([category, titles]) =>
  titles.map((title) => ({ title, category })),
)

export function randomTopic(exclude = '') {
  const pool = TOPICS.filter((t) => t.title !== exclude)
  return pool[Math.floor(Math.random() * pool.length)]
}

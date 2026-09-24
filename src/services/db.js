// Minimal promise wrapper around IndexedDB for storing drafts in this browser.

const DB_NAME = 'post-studio'
const STORE = 'drafts'

let dbPromise = null

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('Database is blocked by another open tab'))
  }).catch((e) => {
    dbPromise = null // allow a retry later
    throw e
  })
  return dbPromise
}

async function run(mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req?.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'))
  })
}

export const getAllDrafts = () => run('readonly', (s) => s.getAll())
export const getDraft = (id) => run('readonly', (s) => s.get(id))
export const putDraft = (record) => run('readwrite', (s) => s.put(record))
export const deleteDraft = (id) => run('readwrite', (s) => s.delete(id))

export async function putMany(records) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const r of records) store.put(r)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

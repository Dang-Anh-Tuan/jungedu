/** IndexedDB — lưu blob ảnh bài làm cục bộ (không dùng Firebase Storage). */

const DB_NAME = 'jungedu-local-media'
const DB_VER = 1
const STORE = 'submission-images'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER)
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
  })
}

/** Khóa ổn định để xóa theo submission: `${submissionId}__${fileId}` */
export function localSubmissionImageKey(submissionId: string, fileId: string): string {
  return `${submissionId}__${fileId}`
}

export async function putSubmissionImageBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('idb tx'))
    tx.objectStore(STORE).put(blob, key)
  })
}

export async function getSubmissionImageBlob(key: string): Promise<Blob | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    tx.onerror = () => reject(tx.error ?? new Error('idb tx'))
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result as Blob | undefined)
  })
}

export async function deleteSubmissionImageBlob(key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('idb tx'))
    tx.objectStore(STORE).delete(key)
  })
}

const PREFIX_END = '\uffff'

/** Xóa mọi blob có khóa bắt đầu bằng `${submissionId}__` */
export async function deleteAllSubmissionImageBlobsForSubmission(submissionId: string): Promise<void> {
  const prefix = `${submissionId}__`
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('idb tx'))
    const store = tx.objectStore(STORE)
    const range = IDBKeyRange.bound(prefix, `${prefix}${PREFIX_END}`)
    const req = store.openCursor(range)
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }
  })
}

import { deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { DriveUploadFolderPrefState } from '../googleDrive/uploadFolderPref'
import { setDriveUploadFolderPrefCache } from '../googleDrive/uploadFolderPref'
import { rewriteFirestoreError } from './firestoreErrors'

const SETTINGS_COLLECTION = 'settings'
export const APP_SETTINGS_DOC_ID = 'app'

export function normalizeDriveUploadFolderPrefFromFirestore(
  raw: Record<string, unknown>
): DriveUploadFolderPrefState {
  const mode = raw.googleDriveUploadFolderMode
  if (mode === 'root') return { kind: 'root' }
  if (mode === 'folder') {
    const id = typeof raw.googleDriveUploadFolderId === 'string' ? raw.googleDriveUploadFolderId.trim() : ''
    if (id) return { kind: 'folder', folderId: id }
  }
  return { kind: 'env' }
}

/** Đồng bộ tuỳ chọn thư mục Drive từ Firestore → cache (realtime). */
export function subscribeAppSettingsDriveUploadFolder(
  onError?: (message: string) => void
): () => void {
  return onSnapshot(
    doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID),
    (snap) => {
      const data = snap.exists() ? (snap.data() as Record<string, unknown>) : {}
      setDriveUploadFolderPrefCache(normalizeDriveUploadFolderPrefFromFirestore(data))
    },
    (error) => {
      console.error('[Firestore] settings/app:', error)
      const msg = rewriteFirestoreError(error).message
      onError?.(msg)
    }
  )
}

export async function saveDriveUploadFolderPrefToFirestore(
  pref: DriveUploadFolderPrefState
): Promise<void> {
  const ref = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID)
  try {
    if (pref.kind === 'env') {
      await setDoc(
        ref,
        {
          googleDriveUploadFolderMode: 'env',
          googleDriveUploadFolderId: deleteField()
        },
        { merge: true }
      )
    } else if (pref.kind === 'root') {
      await setDoc(
        ref,
        {
          googleDriveUploadFolderMode: 'root',
          googleDriveUploadFolderId: deleteField()
        },
        { merge: true }
      )
    } else {
      await setDoc(
        ref,
        {
          googleDriveUploadFolderMode: 'folder',
          googleDriveUploadFolderId: pref.folderId.trim()
        },
        { merge: true }
      )
    }
    setDriveUploadFolderPrefCache(pref)
  } catch (e) {
    throw rewriteFirestoreError(e)
  }
}

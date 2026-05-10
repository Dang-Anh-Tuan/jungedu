import { deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { setTeacherGradingExperienceCache } from '../appSettings/teacherGradingExperiencePref'
import type { DriveUploadFolderPrefState } from '../googleDrive/uploadFolderPref'
import { setDriveUploadFolderPrefCache } from '../googleDrive/uploadFolderPref'
import { getRequiredAuthUid } from './firestorePaths'
import { rewriteFirestoreError } from './firestoreErrors'

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

/** Đồng bộ `settings/app` (thư mục Drive, kinh nghiệm chấm…) → cache (realtime). */
export function subscribeAppSettings(uid: string, onError?: (message: string) => void): () => void {
  return onSnapshot(
    doc(db, 'users', uid, 'settings', APP_SETTINGS_DOC_ID),
    (snap) => {
      const data = snap.exists() ? (snap.data() as Record<string, unknown>) : {}
      setDriveUploadFolderPrefCache(normalizeDriveUploadFolderPrefFromFirestore(data))
      const exp =
        typeof data.teacherGradingExperience === 'string' ? data.teacherGradingExperience : ''
      setTeacherGradingExperienceCache(exp)
    },
    (error) => {
      console.error('[Firestore] settings/app:', error)
      const msg = rewriteFirestoreError(error).message
      onError?.(msg)
    }
  )
}

/** @deprecated Dùng `subscribeAppSettings`. */
export function subscribeAppSettingsDriveUploadFolder(
  uid: string,
  onError?: (message: string) => void
): () => void {
  return subscribeAppSettings(uid, onError)
}

export async function saveDriveUploadFolderPrefToFirestore(
  pref: DriveUploadFolderPrefState
): Promise<void> {
  const uid = getRequiredAuthUid()
  const ref = doc(db, 'users', uid, 'settings', APP_SETTINGS_DOC_ID)
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

export async function saveTeacherGradingExperienceToFirestore(text: string): Promise<void> {
  const uid = getRequiredAuthUid()
  const ref = doc(db, 'users', uid, 'settings', APP_SETTINGS_DOC_ID)
  try {
    await setDoc(ref, { teacherGradingExperience: text }, { merge: true })
    setTeacherGradingExperienceCache(text)
  } catch (e) {
    throw rewriteFirestoreError(e)
  }
}

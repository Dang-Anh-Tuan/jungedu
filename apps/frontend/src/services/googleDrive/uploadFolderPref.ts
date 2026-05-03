import { useSyncExternalStore } from 'react'

export type DriveUploadFolderPrefState =
  | { kind: 'env' }
  | { kind: 'root' }
  | { kind: 'folder'; folderId: string }

export function parseDriveFolderIdFromPaste(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  const folders = t.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (folders) return folders[1]
  const idParam = t.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idParam) return idParam[1]
  if (/^[a-zA-Z0-9_-]+$/.test(t)) return t
  return null
}

/** Cache đồng bộ từ Firestore (`settings/app`), cập nhật qua subscribe trong `main.tsx`. */
let cachedPref: DriveUploadFolderPrefState = { kind: 'env' }
const listeners = new Set<() => void>()

function emit(): void {
  for (const cb of listeners) cb()
}

export function setDriveUploadFolderPrefCache(pref: DriveUploadFolderPrefState): void {
  cachedPref = pref
  emit()
}

export function getDriveUploadFolderPrefCached(): DriveUploadFolderPrefState {
  return cachedPref
}

export function subscribeDriveUploadFolderPref(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => listeners.delete(onStoreChange)
}

export function useDriveUploadFolderPref(): DriveUploadFolderPrefState {
  return useSyncExternalStore(
    subscribeDriveUploadFolderPref,
    getDriveUploadFolderPrefCached,
    getDriveUploadFolderPrefCached
  )
}

/**
 * ID thư mục khi gọi Drive upload:
 * - «theo .env» → `VITE_GOOGLE_DRIVE_UPLOAD_FOLDER_ID` (nếu có).
 * - «root» → không truyền parents (gốc My Drive của người đăng nhập).
 * - «folder» → ID đã lưu Firestore.
 */
export function getEffectiveDriveUploadFolderId(): string | undefined {
  const envFolder = import.meta.env.VITE_GOOGLE_DRIVE_UPLOAD_FOLDER_ID?.trim() || undefined
  if (cachedPref.kind === 'env') return envFolder
  if (cachedPref.kind === 'root') return undefined
  return cachedPref.folderId.trim() || envFolder
}

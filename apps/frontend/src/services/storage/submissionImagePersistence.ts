import type { SubmissionImageFile } from '../../types'
import { getSubmissionImageStorageMode } from '../config'
import { uploadSubmissionImageDataUrl } from '../firebase/storageUpload'
import {
  getDriveUploadFolderPrefCached,
  getEffectiveDriveUploadFolderId
} from '../googleDrive/uploadFolderPref'
import { getStoredGoogleDriveAccessToken } from '../googleDrive/oauth'
import { googleDriveThumbnailUrl } from '../googleDrive/thumbnailUrl'
import { deleteGoogleDriveFile, uploadImageToGoogleDrive } from '../googleDrive/upload'
import {
  deleteAllSubmissionImageBlobsForSubmission,
  deleteSubmissionImageBlob,
  getSubmissionImageBlob,
  localSubmissionImageKey,
  putSubmissionImageBlob
} from '../localMedia/idbSubmissionImages'

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

function isRemoteHttp(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

/**
 * Lưu ảnh theo env: Firebase Storage, Google Drive (OAuth), hoặc IndexedDB cục bộ.
 * Trả về object dùng trong store (có blob URL hoặc URL từ nhà cung cấp).
 */
export async function persistUploadedSubmissionImages(
  submissionId: string,
  files: SubmissionImageFile[]
): Promise<SubmissionImageFile[]> {
  const mode = getSubmissionImageStorageMode()
  const out: SubmissionImageFile[] = []

  let driveToken: string | undefined
  let driveFolderId: string | undefined
  if (mode === 'gdrive') {
    const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID?.trim()
    if (!clientId) {
      throw new Error('Thiếu VITE_GOOGLE_OAUTH_CLIENT_ID trong file .env')
    }
    driveToken = getStoredGoogleDriveAccessToken() ?? undefined
    if (!driveToken) {
      throw new Error(
        'Chưa có quyền Google Drive trong phiên này. Vào Cài đặt → Kết nối Google Drive (hoặc đăng nhập lại app bằng Google) rồi thử tải ảnh lại — không dùng popup OAuth khi chuyển ảnh/OCR.'
      )
    }
    driveFolderId = getEffectiveDriveUploadFolderId()
    if (import.meta.env.DEV) {
      console.info('[JungEdu] Upload ảnh → Google Drive', {
        folderId: driveFolderId ?? '(gốc My Drive — không có parents)',
        firestorePref: getDriveUploadFolderPrefCached()
      })
    }
  }

  for (const file of files) {
    if (isRemoteHttp(file.dataUrl)) {
      if (file.storageKind === 'gdrive' || file.driveFileId) {
        const fid = file.driveFileId
        if (!fid) {
          out.push({
            ...file,
            storageKind: 'firebase',
            localKey: undefined,
            driveFileId: undefined
          })
          continue
        }
        const vu = googleDriveThumbnailUrl(fid)
        out.push({
          ...file,
          dataUrl: vu,
          objectUrl: vu,
          storageKind: 'gdrive',
          driveFileId: fid,
          localKey: undefined
        })
      } else {
        out.push({
          ...file,
          storageKind: 'firebase',
          localKey: undefined,
          driveFileId: undefined
        })
      }
      continue
    }

    if (mode === 'gdrive') {
      const token = driveToken
      if (!token) throw new Error('Thiếu token Google Drive')
      const blob = await dataUrlToBlob(file.dataUrl)
      const { fileId, viewUrl } = await uploadImageToGoogleDrive(
        token,
        blob,
        file.name || 'image.jpg',
        driveFolderId
      )
      out.push({
        ...file,
        driveFileId: fileId,
        dataUrl: viewUrl,
        objectUrl: viewUrl,
        storageKind: 'gdrive',
        localKey: undefined
      })
      continue
    }

    if (mode === 'firebase') {
      try {
        const url = await uploadSubmissionImageDataUrl(submissionId, file.id, file.dataUrl)
        out.push({
          ...file,
          dataUrl: url,
          objectUrl: file.objectUrl,
          storageKind: 'firebase',
          localKey: undefined,
          driveFileId: undefined
        })
      } catch (err) {
        console.warn('[JungEdu] Firebase Storage upload failed, falling back to local IndexedDB', err)
        const key = localSubmissionImageKey(submissionId, file.id)
        const blob = await dataUrlToBlob(file.dataUrl)
        await putSubmissionImageBlob(key, blob)
        const u = URL.createObjectURL(blob)
        out.push({
          ...file,
          dataUrl: u,
          objectUrl: u,
          storageKind: 'local',
          localKey: key,
          driveFileId: undefined
        })
      }
      continue
    }

    const key = localSubmissionImageKey(submissionId, file.id)
    const blob = await dataUrlToBlob(file.dataUrl)
    await putSubmissionImageBlob(key, blob)
    const u = URL.createObjectURL(blob)
    out.push({
      ...file,
      dataUrl: u,
      objectUrl: u,
      storageKind: 'local',
      localKey: key,
      driveFileId: undefined
    })
  }

  return out
}

export type ResolvedImageUrl = { url: string; revokeWhenDone: boolean }

/** URL để hiển thị hoặc fetch làm File (OCR). Nếu `revokeWhenDone`, caller gọi URL.revokeObjectURL sau khi xong. */
export async function resolveSubmissionImageWorkUrl(img: SubmissionImageFile): Promise<ResolvedImageUrl> {
  if (img.storageKind === 'gdrive' && img.driveFileId) {
    return { url: googleDriveThumbnailUrl(img.driveFileId), revokeWhenDone: false }
  }
  const direct = img.dataUrl || img.objectUrl
  if (direct && (direct.startsWith('blob:') || direct.startsWith('data:') || isRemoteHttp(direct))) {
    return { url: direct, revokeWhenDone: false }
  }
  if (img.localKey) {
    const blob = await getSubmissionImageBlob(img.localKey)
    if (blob) {
      return { url: URL.createObjectURL(blob), revokeWhenDone: true }
    }
  }
  return { url: direct || '', revokeWhenDone: false }
}

export async function purgeLocalSubmissionImageFiles(submissionId: string): Promise<void> {
  await deleteAllSubmissionImageBlobsForSubmission(submissionId)
}

/** Xóa file Drive khi còn token trong phiên (best-effort). */
export async function purgeDriveSubmissionImages(images: SubmissionImageFile[]): Promise<void> {
  const token = getStoredGoogleDriveAccessToken()
  if (!token) return
  for (const img of images) {
    if (img.storageKind === 'gdrive' && img.driveFileId) {
      await deleteGoogleDriveFile(token, img.driveFileId)
    }
  }
}

export function revokeSubmissionImageObjectUrls(img: SubmissionImageFile): void {
  if (img.dataUrl.startsWith('blob:')) URL.revokeObjectURL(img.dataUrl)
  if (img.objectUrl.startsWith('blob:') && img.objectUrl !== img.dataUrl) {
    URL.revokeObjectURL(img.objectUrl)
  }
}

async function removeObsoleteLocalBlobs(
  previousFiles: SubmissionImageFile[],
  nextFiles: SubmissionImageFile[]
): Promise<void> {
  const nextIds = new Set(nextFiles.map((f) => f.id))
  for (const prev of previousFiles) {
    if (nextIds.has(prev.id)) continue
    if (prev.localKey) {
      await deleteSubmissionImageBlob(prev.localKey)
    }
    revokeSubmissionImageObjectUrls(prev)
  }
}

/** Xóa blob IndexedDB và file Drive cho các ảnh bị gỡ khỏi danh sách. */
export async function cleanupRemovedSubmissionImages(
  previousFiles: SubmissionImageFile[],
  nextFiles: SubmissionImageFile[]
): Promise<void> {
  await removeObsoleteLocalBlobs(previousFiles, nextFiles)

  const nextIds = new Set(nextFiles.map((f) => f.id))
  const token = getStoredGoogleDriveAccessToken()
  if (!token) return
  for (const prev of previousFiles) {
    if (nextIds.has(prev.id)) continue
    if (prev.storageKind === 'gdrive' && prev.driveFileId) {
      await deleteGoogleDriveFile(token, prev.driveFileId)
    }
  }
}

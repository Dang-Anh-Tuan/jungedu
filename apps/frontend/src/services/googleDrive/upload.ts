import { googleDriveThumbnailUrl } from './thumbnailUrl'

function isScopeInsufficientErrorBody(body: string): boolean {
  const normalized = body.toLowerCase()
  return (
    normalized.includes('insufficient authentication scopes') ||
    normalized.includes('insufficient permission') ||
    normalized.includes('access_token_scope_insufficient')
  )
}

export async function uploadImageToGoogleDrive(
  accessToken: string,
  fileBlob: Blob,
  fileName: string,
  folderId?: string
): Promise<{ fileId: string; viewUrl: string }> {
  const boundary =
    'jungedu_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  const metadata: Record<string, unknown> = { name: fileName }
  if (folderId) metadata.parents = [folderId]

  const mime = fileBlob.type || 'image/jpeg'
  const prelude =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mime}\r\n\r\n`
  const epilogue = `\r\n--${boundary}--`
  const body = new Blob([prelude, fileBlob, epilogue], {
    type: `multipart/related; boundary=${boundary}`
  })

  const uploadUrl =
    'https://www.googleapis.com/upload/drive/v3/files?' +
    new URLSearchParams({
      uploadType: 'multipart',
      fields: 'id',
      supportsAllDrives: 'true'
    }).toString()

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body
  })
  if (!res.ok) {
    const t = await res.text()
    if (res.status === 403 && isScopeInsufficientErrorBody(t)) {
      throw new Error(
        'Drive upload bị từ chối vì token thiếu quyền upload. Hãy đăng xuất rồi đăng nhập lại để cấp quyền Google Drive mới.'
      )
    }
    throw new Error(`Drive upload: ${res.status} ${t}`)
  }
  const data = (await res.json()) as { id?: string }
  if (!data.id) throw new Error('Drive upload: không có file id')
  const fileId = data.id

  const permUrl =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?` +
    new URLSearchParams({ supportsAllDrives: 'true' }).toString()

  const permRes = await fetch(permUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' })
  })
  if (!permRes.ok) {
    const t = await permRes.text()
    throw new Error(`Drive permission: ${permRes.status} ${t}`)
  }

  return { fileId, viewUrl: googleDriveThumbnailUrl(fileId) }
}

export async function deleteGoogleDriveFile(accessToken: string, fileId: string): Promise<void> {
  const delUrl =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?` +
    new URLSearchParams({ supportsAllDrives: 'true' }).toString()

  const res = await fetch(delUrl, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!res.ok && res.status !== 404) {
    const t = await res.text()
    console.warn('[Drive] delete file failed', res.status, t)
  }
}

export async function downloadGoogleDriveFileBlob(
  accessToken: string,
  fileId: string
): Promise<Blob> {
  const downloadUrl =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?` +
    new URLSearchParams({ alt: 'media', supportsAllDrives: 'true' }).toString()

  const res = await fetch(downloadUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Drive download: ${res.status} ${t}`)
  }
  return res.blob()
}

type TokenCallbackResp = {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

interface GisTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (resp: TokenCallbackResp) => void
          }) => GisTokenClient
        }
      }
    }
  }
}

const TOKEN_KEY = 'jungedu_gdrive_at'
const TOKEN_EXP_KEY = 'jungedu_gdrive_exp'

/**
 * Mặc định `drive.file`. Nếu upload vào thư mục bị 403 hoặc file chỉ xuất hiện ở gốc My Drive,
 * đặt `VITE_GOOGLE_DRIVE_SCOPE_FULL=true`, rồi Ngắt / Kết nối lại Drive để xin quyền mới.
 */
export function getGoogleDriveOAuthScopes(): string {
  const v = import.meta.env.VITE_GOOGLE_DRIVE_SCOPE_FULL?.trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes') {
    return 'https://www.googleapis.com/auth/drive'
  }
  return 'https://www.googleapis.com/auth/drive.file'
}

export async function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === 'undefined') return
  if (window.google?.accounts?.oauth2) return
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Không tải được Google Identity Services'))
    document.head.appendChild(s)
  })
}

export function getStoredGoogleDriveAccessToken(): string | null {
  const t = sessionStorage.getItem(TOKEN_KEY)
  const exp = Number(sessionStorage.getItem(TOKEN_EXP_KEY) || 0)
  if (!t || !exp || Date.now() >= exp - 30_000) return null
  return t
}

export function clearGoogleDriveSession(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_EXP_KEY)
}

function persistToken(accessToken: string, expiresInSec: number): void {
  sessionStorage.setItem(TOKEN_KEY, accessToken)
  sessionStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + expiresInSec * 1000))
}

/** Gọi từ nút bấm (cử chỉ người dùng) — lần đầu nên dùng consent. */
export async function connectGoogleDriveInteractive(clientId: string): Promise<string> {
  await loadGoogleIdentityServices()
  const google = window.google
  if (!google?.accounts?.oauth2?.initTokenClient) {
    throw new Error('Google Identity Services chưa sẵn sàng')
  }
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: getGoogleDriveOAuthScopes(),
      callback: (resp: TokenCallbackResp) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error))
          return
        }
        if (!resp.access_token) {
          reject(new Error('Không nhận được access token từ Google'))
          return
        }
        persistToken(resp.access_token, resp.expires_in ?? 3600)
        resolve(resp.access_token)
      }
    })
    client.requestAccessToken({ prompt: 'consent' })
  })
}

/** Thử làm mới token không popup (có thể null). */
export async function refreshGoogleDriveTokenSilent(clientId: string): Promise<string | null> {
  const existing = getStoredGoogleDriveAccessToken()
  if (existing) return existing
  await loadGoogleIdentityServices()
  const google = window.google
  if (!google?.accounts?.oauth2?.initTokenClient) return null
  return new Promise((resolve) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: getGoogleDriveOAuthScopes(),
      callback: (resp: TokenCallbackResp) => {
        if (resp.access_token && !resp.error) {
          persistToken(resp.access_token, resp.expires_in ?? 3600)
          resolve(resp.access_token)
        } else resolve(null)
      }
    })
    try {
      client.requestAccessToken({ prompt: '' })
    } catch {
      resolve(null)
    }
  })
}

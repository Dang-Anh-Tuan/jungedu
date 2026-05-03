import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { saveDriveUploadFolderPrefToFirestore } from '../services/firebase'
import {
  clearGoogleDriveSession,
  connectGoogleDriveInteractive,
  getStoredGoogleDriveAccessToken
} from '../services/googleDrive/oauth'
import {
  parseDriveFolderIdFromPaste,
  useDriveUploadFolderPref,
  type DriveUploadFolderPrefState
} from '../services/googleDrive/uploadFolderPref'

export default function GoogleDriveConnectBanner() {
  const clientId = useMemo(() => import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID?.trim() ?? '', [])
  const [connected, setConnected] = useState(() => !!getStoredGoogleDriveAccessToken())
  const folderPref = useDriveUploadFolderPref()

  const [folderInput, setFolderInput] = useState('')

  useEffect(() => {
    if (folderPref.kind === 'folder') setFolderInput(folderPref.folderId)
    else setFolderInput('')
  }, [folderPref])

  const refresh = useCallback(() => setConnected(!!getStoredGoogleDriveAccessToken()), [])

  const handleConnect = async () => {
    if (!clientId) {
      toast.error('Thiếu VITE_GOOGLE_OAUTH_CLIENT_ID trong file .env')
      return
    }
    try {
      await connectGoogleDriveInteractive(clientId)
      refresh()
      toast.success('Đã kết nối Google Drive')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không kết nối được Google Drive')
    }
  }

  const handleDisconnect = () => {
    clearGoogleDriveSession()
    refresh()
    toast.message('Đã ngắt phiên Google Drive trên trình duyệt này')
  }

  const persistPref = async (pref: DriveUploadFolderPrefState, okMessage: string) => {
    try {
      await saveDriveUploadFolderPrefToFirestore(pref)
      toast.success(okMessage)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được Firestore')
    }
  }

  const handleSaveFolder = () => {
    const id = parseDriveFolderIdFromPaste(folderInput)
    if (!id) {
      toast.error('Không đọc được ID thư mục. Dán URL (…/folders/…) hoặc chỉ chuỗi ID.')
      return
    }
    void persistPref({ kind: 'folder', folderId: id }, 'Đã lưu thư mục lên Firestore')
  }

  const handleFolderRoot = () => {
    void persistPref({ kind: 'root' }, 'Ảnh sẽ lưu ở gốc My Drive (bỏ qua .env)')
  }

  const handleFolderEnv = () => {
    void persistPref({ kind: 'env' }, 'Đã dùng lại mặc định từ .env (nếu có)')
  }

  const prefLabel =
    folderPref.kind === 'folder'
      ? `Thư mục tuỳ chọn (${folderPref.folderId})`
      : folderPref.kind === 'root'
        ? 'Gốc My Drive'
        : 'Theo .env hoặc gốc My Drive'

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-900">Lưu ảnh lên Google Drive</div>
          <p className="text-slate-600 mt-0.5">
            Trước khi tải ảnh lên, hãy đăng nhập Google trên trình duyệt này (phiên lưu trong tab hiện tại).
          </p>
          {!clientId ? (
            <p className="text-amber-800 mt-1">Chưa cấu hình OAuth Client ID trong .env.</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {connected ? (
            <>
              <span className="inline-flex items-center rounded-lg bg-emerald-100 px-3 py-1.5 text-emerald-900 font-medium">
                Đã kết nối Drive
              </span>
              <button
                type="button"
                onClick={handleDisconnect}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium text-slate-800 hover:bg-slate-50"
              >
                Ngắt kết nối
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={!clientId}
              className="rounded-xl bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800 disabled:opacity-50"
            >
              Kết nối Google Drive
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-sky-200 pt-3 space-y-2">
        <div className="font-medium text-slate-900">Thư mục lưu ảnh (đồng bộ Firestore)</div>
        <p className="text-slate-600 text-xs sm:text-sm">
          Lưu tại <code className="text-slate-800">settings/app</code>. Ưu tiên: tuỳ chọn dưới đây &gt;{' '}
          <code className="text-slate-800">VITE_GOOGLE_DRIVE_UPLOAD_FOLDER_ID</code> trong .env. Mọi thiết bị dùng chung
          Firestore đều thấy cùng một lựa chọn (cần quyền ghi document này trong Rules).
        </p>
        <p className="text-xs text-slate-700">
          Đang chọn: <span className="font-medium text-slate-900">{prefLabel}</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="text"
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            placeholder="Dán URL thư mục Drive hoặc chỉ ID"
            className="flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveFolder}
              className="rounded-xl bg-sky-700 px-3 py-2 font-medium text-white hover:bg-sky-800"
            >
              Lưu thư mục
            </button>
            <button
              type="button"
              onClick={handleFolderRoot}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium text-slate-800 hover:bg-slate-50"
            >
              Gốc My Drive
            </button>
            <button
              type="button"
              onClick={handleFolderEnv}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium text-slate-800 hover:bg-slate-50"
            >
              Theo .env
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

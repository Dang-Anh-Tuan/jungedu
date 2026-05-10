import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { saveDriveUploadFolderPrefToFirestore } from '../services/firebase'
import {
  parseDriveFolderIdFromPaste,
  useDriveUploadFolderPref,
  type DriveUploadFolderPrefState
} from '../services/googleDrive/uploadFolderPref'

type Props = {
  /** Giao diện gọn cho trang Cài đặt: chỉ ô dán đường dẫn + nút cập nhật. */
  compact?: boolean
}

export default function GoogleDriveConnectBanner({ compact }: Props) {
  const folderPref = useDriveUploadFolderPref()

  const [folderInput, setFolderInput] = useState('')

  useEffect(() => {
    if (folderPref.kind === 'folder') setFolderInput(folderPref.folderId)
    else setFolderInput('')
  }, [folderPref])

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
    void persistPref({ kind: 'folder', folderId: id }, 'Đã cập nhật thư mục lưu ảnh')
  }

  if (compact) {
    return (
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          type="text"
          value={folderInput}
          onChange={(e) => setFolderInput(e.target.value)}
          placeholder="Dán URL hoặc ID thư mục Google Drive"
          className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={handleSaveFolder}
          className="rounded-xl bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800 whitespace-nowrap"
        >
          Cập nhật thư mục
        </button>
      </div>
    )
  }

  const prefLabel =
    folderPref.kind === 'folder'
      ? `Thư mục tuỳ chọn (${folderPref.folderId})`
      : folderPref.kind === 'root'
        ? 'Gốc My Drive'
        : 'Theo .env hoặc gốc My Drive'

  const handleFolderRoot = () => {
    void persistPref({ kind: 'root' }, 'Ảnh sẽ lưu ở gốc My Drive (bỏ qua .env)')
  }

  const handleFolderEnv = () => {
    void persistPref({ kind: 'env' }, 'Đã dùng lại mặc định từ .env (nếu có)')
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-800 space-y-4">
      <div>
        <div>
          <div className="font-semibold text-slate-900">Thư mục lưu ảnh Google Drive</div>
          <p className="text-slate-600 mt-0.5">
            Bạn đã đăng nhập Google từ bước vào ứng dụng. Ở đây chỉ cần chọn thư mục Drive để lưu ảnh.
          </p>
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

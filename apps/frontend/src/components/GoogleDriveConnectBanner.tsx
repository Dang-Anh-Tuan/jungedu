import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { saveDriveUploadFolderPrefToFirestore } from '../platform/persistence'
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
  const { t } = useTranslation()
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
      toast.error(e instanceof Error ? e.message : t('googleDrive.toastFirestore'))
    }
  }

  const handleSaveFolder = () => {
    const id = parseDriveFolderIdFromPaste(folderInput)
    if (!id) {
      toast.error(t('googleDrive.parseError'))
      return
    }
    void persistPref({ kind: 'folder', folderId: id }, t('googleDrive.toastFolderOk'))
  }

  if (compact) {
    return (
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          type="text"
          value={folderInput}
          onChange={(e) => setFolderInput(e.target.value)}
          placeholder={t('googleDrive.placeholderCompact')}
          className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={handleSaveFolder}
          className="rounded-xl bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800 whitespace-nowrap"
        >
          {t('googleDrive.updateFolder')}
        </button>
      </div>
    )
  }

  const prefLabel =
    folderPref.kind === 'folder'
      ? t('googleDrive.prefFolder', { id: folderPref.folderId })
      : folderPref.kind === 'root'
        ? t('googleDrive.prefRoot')
        : t('googleDrive.prefEnv')

  const handleFolderRoot = () => {
    void persistPref({ kind: 'root' }, t('googleDrive.toastRoot'))
  }

  const handleFolderEnv = () => {
    void persistPref({ kind: 'env' }, t('googleDrive.toastEnv'))
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-800 space-y-4">
      <div>
        <div>
          <div className="font-semibold text-slate-900">{t('googleDrive.folderTitle')}</div>
          <p className="text-slate-600 mt-0.5">{t('googleDrive.folderBody')}</p>
        </div>
      </div>

      <div className="border-t border-sky-200 pt-3 space-y-2">
        <div className="font-medium text-slate-900">{t('googleDrive.syncTitle')}</div>
        <p className="text-slate-600 text-xs sm:text-sm">{t('googleDrive.syncBody')}</p>
        <p className="text-xs text-slate-700">
          {t('googleDrive.current')} <span className="font-medium text-slate-900">{prefLabel}</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="text"
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            placeholder={t('googleDrive.placeholder')}
            className="flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveFolder}
              className="rounded-xl bg-sky-700 px-3 py-2 font-medium text-white hover:bg-sky-800"
            >
              {t('googleDrive.saveFolder')}
            </button>
            <button
              type="button"
              onClick={handleFolderRoot}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium text-slate-800 hover:bg-slate-50"
            >
              {t('googleDrive.rootDrive')}
            </button>
            <button
              type="button"
              onClick={handleFolderEnv}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium text-slate-800 hover:bg-slate-50"
            >
              {t('googleDrive.fromEnv')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

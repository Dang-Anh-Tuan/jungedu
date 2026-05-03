import React from 'react'
import { Link } from 'react-router-dom'
import GoogleDriveConnectBanner from '../components/GoogleDriveConnectBanner'
import { getSubmissionImageStorageMode } from '../services/config'

export default function ProfilePage() {
  const mode = getSubmissionImageStorageMode()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Cài đặt</h1>
        <p className="text-sm text-slate-600 mt-1">
          Kết nối Google Drive và thư mục lưu ảnh — không còn trên trang nhập bài.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Ảnh bài làm</h2>
        <p className="text-sm text-slate-600">
          Chế độ lưu (theo biến env):{' '}
          <strong className="text-slate-900">{mode}</strong>
          {mode !== 'gdrive' ? (
            <>
              {' '}
              — muốn dùng Drive thì đặt{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">
                VITE_SUBMISSION_IMAGE_STORAGE=gdrive
              </code>{' '}
              và khởi động lại dev server / build.
            </>
          ) : null}
        </p>
        {mode === 'gdrive' ? (
          <GoogleDriveConnectBanner />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            Kết nối Google Drive chỉ khả dụng khi{' '}
            <code className="rounded bg-white px-1 text-xs">gdrive</code> được bật trong env như trên.
          </div>
        )}
      </section>

      <p className="text-sm">
        <Link to="/" className="font-medium text-emerald-800 hover:underline">
          ← Về trang chủ
        </Link>
      </p>
    </div>
  )
}

import React from 'react'
import { Link } from 'react-router-dom'
import GoogleDriveConnectBanner from '../components/GoogleDriveConnectBanner'

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Cài đặt</h1>
        <p className="text-sm text-slate-600 mt-1">
          Trang này chỉ quản lý đường dẫn thư mục Google Drive để lưu ảnh bài làm.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Ảnh bài làm</h2>
        <GoogleDriveConnectBanner />
      </section>

      <p className="text-sm">
        <Link to="/" className="font-medium text-emerald-800 hover:underline">
          ← Về trang chủ
        </Link>
      </p>
    </div>
  )
}

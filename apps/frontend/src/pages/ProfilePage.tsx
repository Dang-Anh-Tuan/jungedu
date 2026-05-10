import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import GoogleDriveConnectBanner from '../components/GoogleDriveConnectBanner'
import { saveTeacherGradingExperienceToFirestore } from '../services/firebase'
import { useTeacherGradingExperiencePref } from '../services/appSettings/teacherGradingExperiencePref'

const DEBOUNCE_MS = 650

function TeacherGradingExperienceCard() {
  const synced = useTeacherGradingExperiencePref()
  const [draft, setDraft] = useState(synced)
  const debounceTimer = useRef<number>()

  useEffect(() => {
    setDraft(synced)
  }, [synced])

  const saveQuiet = useCallback(async (text: string) => {
    try {
      await saveTeacherGradingExperienceToFirestore(text)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được kinh nghiệm chấm')
    }
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current)
    }
  }, [])

  const scheduleSave = (text: string) => {
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current)
    debounceTimer.current = window.setTimeout(() => {
      void saveQuiet(text)
    }, DEBOUNCE_MS)
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">Kinh nghiệm chấm chung</h2>
      <p className="text-sm text-slate-600">
        Đoạn này được gửi kèm mỗi lần chấm AI cùng với yêu cầu đề, rubric và bài làm của học sinh.
      </p>
      <textarea
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 min-h-[140px] resize-y"
        value={draft}
        onChange={(e) => {
          const v = e.target.value
          setDraft(v)
          scheduleSave(v)
        }}
        onBlur={() => void saveQuiet(draft)}
        placeholder="Ví dụ: Luôn ghi nhận cố gắng; với HS yếu ưu tiên động viên trước khi nhắc lỗi…"
      />
      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        <span aria-hidden>✨</span>
        Kinh nghiệm khi nhập sẽ được tự động lưu nha bé.
      </p>
    </section>
  )
}

export default function ProfilePage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Cài đặt</h1>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Nơi lưu trữ dữ liệu</h2>
        <p className="text-sm text-slate-600">Thư mục Google Drive để lưu ảnh bài làm (đồng bộ theo tài khoản).</p>
        <GoogleDriveConnectBanner compact />
      </section>

      <TeacherGradingExperienceCard />

      <p className="text-sm">
        <Link to="/" className="font-medium text-emerald-800 hover:underline">
          ← Về trang chủ
        </Link>
      </p>
    </div>
  )
}

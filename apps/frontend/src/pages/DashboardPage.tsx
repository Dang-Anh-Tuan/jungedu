import React, { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppStore } from '../state/appStore'

export default function DashboardPage() {
  const navigate = useNavigate()
  const exams = useAppStore((s) => s.exams)
  const classes = useAppStore((s) => s.classes)
  const submissions = useAppStore((s) => s.submissions)
  const cloneExam = useAppStore((s) => s.cloneExam)
  const deleteExam = useAppStore((s) => s.deleteExam)

  const recentExam = exams.slice().sort((a, b) => b.id.localeCompare(a.id))[0]

  const gradedCountByExamId = useMemo(() => {
    const map = new Map<string, number>()
    for (const sub of submissions) {
      if (!sub.gradingResult) continue
      map.set(sub.examId, (map.get(sub.examId) ?? 0) + 1)
    }
    return map
  }, [submissions])

  const submissionCountByExamId = useMemo(() => {
    const map = new Map<string, number>()
    for (const sub of submissions) {
      map.set(sub.examId, (map.get(sub.examId) ?? 0) + 1)
    }
    return map
  }, [submissions])

  function classLabel(classId: string) {
    return classes.find((c) => c.id === classId)?.name ?? 'Lớp'
  }

  return (
    <div className="space-y-10">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 text-white px-8 py-10 shadow-xl shadow-emerald-900/10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl space-y-3">
            <p className="text-emerald-100 text-sm uppercase tracking-wide font-medium">MVP · Trợ lý giáo viên</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">JungEdu Assistant</h1>
            <p className="text-emerald-50/95 text-base leading-relaxed">
              Luồng đề xuất: nhập ảnh bài làm → nhận chữ → chỉnh tay → AI gợi ý điểm → giáo viên duyệt.
            </p>
          </div>
          <div className="flex flex-col gap-3 min-w-[200px]">
            <Link
              to="/classes"
              className="rounded-xl bg-white/15 backdrop-blur px-5 py-3 text-center text-sm font-medium border border-white/20 hover:bg-white/25 transition-colors"
            >
              Lớp
            </Link>
            <Link
              to="/exams/new"
              className="rounded-xl bg-white text-emerald-800 px-5 py-3 text-center text-sm font-semibold hover:bg-emerald-50 transition-colors"
            >
              + Tạo bài kiểm tra
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <button
          type="button"
          className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm hover:border-emerald-300 hover:shadow-md transition-all"
          onClick={() => navigate('/exams/new')}
        >
          <div className="text-lg font-semibold text-slate-900 group-hover:text-emerald-900">Tạo bài kiểm tra</div>
          <p className="mt-2 text-sm text-slate-600 leading-snug">Thiết lập rubric và chọn lớp có danh sách học sinh.</p>
        </button>

        <button
          type="button"
          className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm hover:border-emerald-300 hover:shadow-md transition-all disabled:opacity-45 disabled:pointer-events-none"
          disabled={!recentExam}
          onClick={() => recentExam && navigate(`/exams/${recentExam.id}/submissions/new`)}
        >
          <div className="text-lg font-semibold text-slate-900 group-hover:text-emerald-900">Chấm bài</div>
          <p className="mt-2 text-sm text-slate-600 leading-snug">
            Mở bảng nhập ảnh theo từng học sinh cho bài gần nhất {recentExam ? `(${recentExam.title})` : ''}.
          </p>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Bài kiểm tra gần đây</h2>
          <span className="text-xs text-slate-500">{exams.length} bài</span>
        </div>
        {exams.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">Chưa có bài nào — bấm «Tạo bài kiểm tra».</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {exams
              .slice()
              .reverse()
              .map((exam) => {
                const graded = gradedCountByExamId.get(exam.id) ?? 0
                const subs = submissionCountByExamId.get(exam.id) ?? 0
                return (
                  <li key={exam.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                    <div>
                      <div className="font-medium text-slate-900">{exam.title}</div>
                      <div className="text-sm text-slate-500 mt-0.5">
                        {classLabel(exam.classId)} · Khối {exam.grade} · {exam.subject}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end items-center">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                        onClick={() => navigate(`/exams/${exam.id}/edit`)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                        onClick={() => {
                          try {
                            const nid = cloneExam(exam.id)
                            toast.success(`Đã nhân bản «${exam.title}».`)
                            navigate(`/exams/${nid}/edit`)
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : 'Không nhân bản được bài kiểm tra.')
                          }
                        }}
                      >
                        Nhân bản
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 text-red-700 px-3 py-1.5 text-xs font-medium hover:bg-red-50"
                        onClick={() => {
                          if (
                            confirm(
                              `Xoá bài «${exam.title}»? Toàn bộ bài làm và kết quả chấm của bài này sẽ bị xoá.`
                            )
                          ) {
                            deleteExam(exam.id)
                            toast.success(`Đã xóa «${exam.title}».`)
                          }
                        }}
                      >
                        Xoá
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-sm hover:bg-emerald-700"
                        onClick={() => navigate(`/exams/${exam.id}/submissions/new`)}
                      >
                        Chấm bài ({subs} bài · {graded} đã chấm AI)
                      </button>
                    </div>
                  </li>
                )
              })}
          </ul>
        )}
      </div>
    </div>
  )
}

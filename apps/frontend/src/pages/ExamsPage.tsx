import React, { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppStore } from '../state/appStore'

export default function ExamsPage() {
  const navigate = useNavigate()
  const exams = useAppStore((s) => s.exams)
  const classes = useAppStore((s) => s.classes)
  const submissions = useAppStore((s) => s.submissions)
  const cloneExam = useAppStore((s) => s.cloneExam)
  const deleteExam = useAppStore((s) => s.deleteExam)

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Danh sách Bài kiểm tra</h1>
          <p className="text-sm text-slate-600 mt-1">Quản lý và chấm điểm tất cả các bài kiểm tra đã tạo.</p>
        </div>
        <Link
          to="/exams/new"
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          + Tạo bài kiểm tra mới
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {exams.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">Chưa có bài nào — hãy tạo bài kiểm tra đầu tiên.</div>
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
                        onClick={async () => {
                          try {
                            const nid = await cloneExam(exam.id)
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
                            window.confirm(
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

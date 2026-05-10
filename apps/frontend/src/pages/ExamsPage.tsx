import React, { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAppStore } from '../state/appStore'

export default function ExamsPage() {
  const { t } = useTranslation()
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
    return classes.find((c) => c.id === classId)?.name ?? t('defaults.classFallback')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('examsPage.title')}</h1>
          <p className="text-sm text-slate-600 mt-1">{t('examsPage.subtitle')}</p>
        </div>
        <Link
          to="/exams/new"
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          {t('examsPage.newExam')}
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {exams.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">{t('examsPage.empty')}</div>
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
                        {classLabel(exam.classId)} · {t('dashboard.gradeBlock')} {exam.grade} · {exam.subject}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end items-center">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                        onClick={() => navigate(`/exams/${exam.id}/edit`)}
                      >
                        {t('dashboard.edit')}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                        onClick={async () => {
                          try {
                            const nid = await cloneExam(exam.id)
                            toast.success(t('dashboard.toastCloneOk', { title: exam.title }))
                            navigate(`/exams/${nid}/edit`)
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : t('dashboard.toastCloneFail'))
                          }
                        }}
                      >
                        {t('dashboard.duplicate')}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 text-red-700 px-3 py-1.5 text-xs font-medium hover:bg-red-50"
                        onClick={() => {
                          if (window.confirm(t('dashboard.confirmDelete', { title: exam.title }))) {
                            deleteExam(exam.id)
                            toast.success(t('dashboard.toastDeleteOk', { title: exam.title }))
                          }
                        }}
                      >
                        {t('dashboard.delete')}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-sm hover:bg-emerald-700"
                        onClick={() => navigate(`/exams/${exam.id}/submissions/new`)}
                      >
                        {t('dashboard.gradeButton', { subs, graded })}
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

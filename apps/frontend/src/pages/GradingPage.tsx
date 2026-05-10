import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { runAiGrade } from '../application/gradingService'
import { mistakeTypeLabelVi } from '../lib/mistakeLabels'
import { sumGradingScores } from '../lib/rubric'
import { useTeacherGradingExperiencePref } from '../services/appSettings/teacherGradingExperiencePref'
import { useAppStore } from '../state/appStore'

export default function GradingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { submissionId } = useParams()
  const teacherGradingExperience = useTeacherGradingExperiencePref()

  const submissions = useAppStore((s) => s.submissions)
  const exams = useAppStore((s) => s.exams)
  const students = useAppStore((s) => s.students)
  const setGradingResult = useAppStore((s) => s.setGradingResult)

  const submission = submissions.find((s) => s.id === submissionId)
  const exam = useMemo(() => {
    if (!submission) return undefined
    return exams.find((e) => e.id === submission.examId)
  }, [submission, exams])
  const student = useMemo(() => {
    if (!submission) return undefined
    return students.find((st) => st.id === submission.studentId)
  }, [submission, students])

  const combinedText = useMemo(() => {
    if (!submission) return ''
    return submission.ocrPages
      .map((p) => p.correctedText)
      .join('\n')
      .trim()
  }, [submission])

  const [running, setRunning] = useState(false)

  async function onRunGrade() {
    if (!submission || !exam || !student) return
    setRunning(true)
    try {
      const result = await runAiGrade({
        essayText: combinedText,
        exam: {
          title: exam.title,
          subject: exam.subject,
          grade: exam.grade,
          requirements: exam.requirements,
          rubric: exam.rubric,
          teacherStyle: exam.teacherStyle
        },
        student: {
          name: student.name,
          tags: student.tags,
          notes: student.notes,
          hocLuc: student.hocLuc
        },
        teacherGradingExperience
      })

      await setGradingResult(submission.id, result)
      toast.success(t('grading.toastOk'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  if (!submission) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-lg font-semibold text-slate-900">{t('grading.notFound')}</div>
      </div>
    )
  }

  const grading = submission.gradingResult

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('grading.title')}</h1>
          <p className="text-sm text-slate-600 mt-1">
            {t('grading.subtitlePrefix')} <strong>{submission.studentName}</strong>
          </p>
        </div>
        <button type="button" className="text-sm text-slate-600 hover:text-slate-900" onClick={() => navigate(-1)}>
          {t('grading.back')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-xl bg-emerald-600 text-white px-5 py-2 text-sm font-medium disabled:opacity-40 hover:bg-emerald-700"
          disabled={running || !combinedText.trim()}
          onClick={onRunGrade}
        >
          {running ? t('grading.running') : grading ? t('grading.rerun') : t('grading.run')}
        </button>
      </div>

      {!grading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">{t('grading.empty')}</div>
      )}

      {grading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2 space-y-5 shadow-sm">
            <div className="text-2xl font-semibold text-slate-900">
              {t('grading.scoreSuggested', { score: grading.score.toFixed(1) })}
            </div>
            <p className="text-sm text-slate-500">
              {t('grading.scoreHint', { sum: sumGradingScores(grading.rubric).toFixed(1) })}
            </p>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="font-semibold text-slate-800">{t('grading.strengths')}</div>
              {grading.strengths.length === 0 ? (
                <div className="text-sm text-slate-500">{t('grading.noStrengths')}</div>
              ) : (
                <ul className="list-disc ml-5 text-sm text-slate-700 space-y-1">
                  {grading.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="font-semibold text-slate-800">{t('grading.issues')}</div>
              {grading.mistakes.length === 0 ? (
                <div className="text-sm text-slate-500">{t('grading.noIssues')}</div>
              ) : (
                <div className="space-y-3">
                  {grading.mistakes.slice(0, 20).map((m, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-100 p-4 bg-slate-50/50">
                      <div className="text-sm font-semibold text-slate-800">{mistakeTypeLabelVi(m.type)}</div>
                      <div className="text-sm text-slate-700 mt-1">
                        {t('grading.segmentOriginal')} {m.original}
                      </div>
                      {m.suggestion && (
                        <div className="text-sm text-slate-700">
                          {t('grading.suggestion')} {m.suggestion}
                        </div>
                      )}
                      {m.explanation && <div className="text-sm text-slate-500 mt-2">{m.explanation}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="font-semibold text-slate-800">{t('grading.rewrite')}</div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">
                {grading.rewriteSuggestion || t('grading.none')}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm h-fit">
            <div className="font-semibold text-slate-800">{t('grading.aiComment')}</div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">
              {grading.teacherComment || t('grading.none')}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="text-sm text-slate-500 mb-2">{t('grading.rubricDetail')}</div>
              <div className="text-sm space-y-1 text-slate-700">
                {exam?.rubric.map((c) => (
                  <div key={c.id}>
                    {c.label}: {grading.rubric[c.id] ?? t('grading.rubricDash')}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="w-full rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-medium hover:bg-slate-800 disabled:opacity-40"
              disabled={!grading}
              onClick={() => navigate(`/submissions/${submission.id}/review`)}
            >
              {t('grading.reviewCta')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

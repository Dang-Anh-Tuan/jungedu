import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  DEFAULT_RUBRIC_CRITERIA,
  createRubricCriterionId,
  totalRubricWeight,
  type RubricCriterion
} from '../lib/rubric'
import { useAppStore } from '../state/appStore'
import { DEMO_EXAM_DEFAULTS } from '../config/demoExamDefaults'

const teacherStyleOptions = ['encouraging', 'neutral', 'strict'] as const

export default function CreateExamPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const classes = useAppStore((s) => s.classes)
  const createExam = useAppStore((s) => s.createExam)

  const [classId, setClassId] = useState('')
  const [title, setTitle] = useState(DEMO_EXAM_DEFAULTS.title)
  const [subject, setSubject] = useState(DEMO_EXAM_DEFAULTS.subject)
  const [grade, setGrade] = useState(DEMO_EXAM_DEFAULTS.grade)
  const [requirements, setRequirements] = useState(DEMO_EXAM_DEFAULTS.requirements)
  const [teacherStyle, setTeacherStyle] = useState<(typeof teacherStyleOptions)[number]>('encouraging')

  const [rubric, setRubric] = useState<RubricCriterion[]>(() =>
    DEFAULT_RUBRIC_CRITERIA.map((c) => ({ ...c }))
  )

  const [saving, setSaving] = useState(false)

  const totalRubric = useMemo(() => totalRubricWeight(rubric), [rubric])

  const selectedClass = classes.find((c) => c.id === classId)

  function addCriterion() {
    setRubric((r) => [...r, { id: createRubricCriterionId(), label: t('createExam.newCriterion'), weight: 1 }])
  }

  function removeCriterion(id: string) {
    setRubric((r) => (r.length <= 1 ? r : r.filter((c) => c.id !== id)))
  }

  function updateCriterion(id: string, patch: Partial<RubricCriterion>) {
    setRubric((r) => r.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  async function onCreateExam() {
    if (!classId || classes.length === 0 || saving) return
    const cleaned = rubric
      .map((c) => ({
        ...c,
        label: c.label.trim(),
        weight: Number.isFinite(c.weight) ? Math.max(0, c.weight) : 0
      }))
      .filter((c) => c.label.length > 0)
    if (cleaned.length === 0) {
      toast.error(t('createExam.toastRubricEmpty'))
      return
    }
    setSaving(true)
    try {
      const examId = await createExam({
        classId,
        title: title.trim(),
        subject: subject.trim(),
        grade: Number(grade),
        requirements: requirements.trim(),
        rubric: cleaned,
        teacherStyle
      })
      toast.success(t('createExam.toastOk'))
      navigate(`/exams/${examId}/submissions/new`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('createExam.toastFail'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('createExam.title')}</h1>
          <p className="text-sm text-slate-600 mt-1">
            {t('createExam.subtitlePrefix')} <strong>{t('createExam.subtitleStrong')}</strong> {t('createExam.subtitleSuffix')}{' '}
            <Link to="/classes" className="text-emerald-700 font-medium hover:underline">
              {t('createExam.classesLink')}
            </Link>
            .
          </p>
        </div>
        <Link to="/" className="text-sm text-slate-600 hover:text-slate-900">
          {t('createExam.home')}
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 space-y-2">
          <p className="font-medium">{t('createExam.needClass')}</p>
          <p>
            {t('createExam.goClasses')}{' '}
            <Link to="/classes" className="text-emerald-800 font-semibold underline">
              {t('createExam.classesLink')}
            </Link>{' '}
            {t('createExam.goClassesSuffix')}
          </p>
        </div>
      ) : null}

      {classes.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="font-semibold text-slate-800">{t('createExam.infoTitle')}</h2>
              <label className="block text-sm">
                <span className="text-slate-600">{t('createExam.classLabel')}</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    {t('createExam.classPlaceholder')}
                  </option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.grade != null ? t('classes.gradeSuffix', { grade: c.grade }) : ''}
                    </option>
                  ))}
                </select>
              </label>
              {selectedClass && (
                <p className="text-xs text-slate-500">
                  {t('createExam.classHint', { name: selectedClass.name })}
                </p>
              )}
              <label className="block text-sm">
                <span className="text-slate-600">{t('createExam.examTitle')}</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">{t('createExam.subject')}</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">{t('createExam.grade')}</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  type="number"
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">{t('createExam.aiStyle')}</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={teacherStyle}
                  onChange={(e) => setTeacherStyle(e.target.value as (typeof teacherStyleOptions)[number])}
                >
                  {teacherStyleOptions.map((s) => (
                    <option key={s} value={s}>
                      {s === 'encouraging'
                        ? t('createExam.styleEncouraging')
                        : s === 'neutral'
                          ? t('createExam.styleNeutral')
                          : t('createExam.styleStrict')}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="font-semibold text-slate-800">{t('createExam.rubricTitle')}</h2>
              <label className="block text-sm">
                <span className="text-slate-600">{t('createExam.requirements')}</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 min-h-[120px]"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{t('createExam.criteriaHeading')}</span>
                  <button
                    type="button"
                    onClick={addCriterion}
                    className="text-sm text-emerald-700 font-medium hover:underline"
                  >
                    {t('createExam.addCriterion')}
                  </button>
                </div>
                <ul className="space-y-2">
                  {rubric.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2"
                    >
                      <label className="block text-sm flex-1 min-w-[140px]">
                        <span className="text-xs text-slate-500">{t('createExam.criterionName')}</span>
                        <input
                          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                          value={c.label}
                          onChange={(e) => updateCriterion(c.id, { label: e.target.value })}
                        />
                      </label>
                      <label className="block text-sm w-24">
                        <span className="text-xs text-slate-500">{t('createExam.weight')}</span>
                        <input
                          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                          type="number"
                          min={0}
                          step={0.5}
                          value={c.weight}
                          onChange={(e) => updateCriterion(c.id, { weight: Number(e.target.value) })}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={rubric.length <= 1}
                        onClick={() => removeCriterion(c.id)}
                        className="text-xs text-red-600 hover:text-red-700 disabled:opacity-30 px-2 py-2"
                        title={t('createExam.removeCriterion')}
                      >
                        {t('createExam.removeCriterion')}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-slate-500">{t('createExam.totalWeight', { total: totalRubric })}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-xl bg-emerald-600 text-white px-6 py-2.5 font-medium shadow-sm hover:bg-emerald-700 disabled:opacity-40"
              onClick={() => void onCreateExam()}
              disabled={!title.trim() || !classId || saving}
            >
              {saving ? t('createExam.saving') : t('createExam.save')}
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

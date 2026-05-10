import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { TIMING } from '../config/constants'
import { resolveMistakeSpans } from '../lib/essayMistakeSpans'
import { mistakeTypeLabelVi } from '../lib/mistakeLabels'
import {
  DEFAULT_RUBRIC_CRITERIA,
  gradingRubricScoresEqual,
  mergeGradingScoresWithCriteria,
  sumGradingScores,
  type GradingRubricScores
} from '../lib/rubric'
import { useAppStore } from '../state/appStore'
import type { GradingMistake, GradingResult } from '../types'

function mistakeTypeBadge(mistakeType: string) {
  const colorMap: Record<string, string> = {
    spelling: 'bg-red-100 text-red-700 border-red-200',
    grammar: 'bg-orange-100 text-orange-700 border-orange-200',
    punctuation: 'bg-amber-100 text-amber-800 border-amber-200',
    repeat: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    missing_idea: 'bg-blue-100 text-blue-700 border-blue-200',
    structure: 'bg-purple-100 text-purple-700 border-purple-200',
    suggestion: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    other: 'bg-slate-100 text-slate-600 border-slate-200'
  }
  return colorMap[mistakeType] ?? 'bg-slate-100 text-slate-600 border-slate-200'
}

function clampRubricValue(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(10, Math.round(v * 10) / 10))
}

function scoreFromRubricDraft(draft: GradingRubricScores): number {
  const total = sumGradingScores(draft)
  return Math.max(0, Math.min(10, Math.round(total * 10) / 10))
}

function normalizeStrengthsInput(values: unknown[] | undefined): string[] {
  if (!Array.isArray(values)) return []
  return values
    .map((v) => {
      if (typeof v === 'string') return v.trim()
      if (v && typeof v === 'object' && 'text' in v && typeof (v as { text?: unknown }).text === 'string') {
        return (v as { text: string }).text.trim()
      }
      return String(v ?? '').trim()
    })
    .filter(Boolean)
}

/**
 * Render the essay text with inline error highlights and suggestion overlays.
 */
function AnnotatedEssay({
  text,
  mistakes,
  showErrors,
  showSuggestions
}: {
  text: string
  mistakes: GradingMistake[]
  showErrors: boolean
  showSuggestions: boolean
}) {
  const annotations = useMemo(
    () => resolveMistakeSpans(text, mistakes),
    [text, mistakes]
  )

  if (!showErrors && !showSuggestions) {
    return <p className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">{text}</p>
  }

  const segments: React.ReactNode[] = []
  let cursor = 0

  for (const ann of annotations) {
    const { start, end, mistake } = ann
    const isSpellingOrGrammar =
      mistake.type === 'spelling' || mistake.type === 'grammar' || mistake.type === 'punctuation'
    const isSuggestion = !isSpellingOrGrammar

    if (!showErrors && isSpellingOrGrammar) continue
    if (!showSuggestions && isSuggestion) continue

    if (start > cursor) {
      segments.push(<span key={`plain-${cursor}`}>{text.slice(cursor, start)}</span>)
    }

    const original = text.slice(start, end)

    if (showErrors && isSpellingOrGrammar) {
      segments.push(
        <span key={`err-${start}`} className="relative group inline">
          <mark className="bg-red-200 text-red-900 rounded px-1 cursor-help border-b-2 border-red-500">
            {original}
          </mark>
          {mistake.suggestion && (
            <span className="text-emerald-700 text-xs ml-1 font-medium">({mistake.suggestion})</span>
          )}
        </span>
      )
    } else if (showSuggestions && isSuggestion) {
      segments.push(
        <span key={`sug-${start}`} className="inline">
          <mark className="bg-yellow-300 text-yellow-900 rounded px-1">
            {original}
          </mark>
          {mistake.suggestion && (
            <span className="text-emerald-700 text-xs ml-1 font-medium">({mistake.suggestion})</span>
          )}
        </span>
      )
    } else {
      segments.push(<span key={`skip-${start}`}>{original}</span>)
    }

    cursor = end
  }

  if (cursor < text.length) {
    segments.push(<span key={`plain-end`}>{text.slice(cursor)}</span>)
  }

  return (
    <p className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">
      {segments}
    </p>
  )
}

export default function ReviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { submissionId } = useParams()

  const submissions = useAppStore((s) => s.submissions)
  const exams = useAppStore((s) => s.exams)
  const setGradingResult = useAppStore((s) => s.setGradingResult)

  const submission = submissions.find((s) => s.id === submissionId)
  const exam = useMemo(
    () => (submission ? exams.find((e) => e.id === submission.examId) : undefined),
    [submission, exams]
  )
  const criteria = useMemo(
    () => (exam?.rubric?.length ? exam.rubric : DEFAULT_RUBRIC_CRITERIA),
    [exam?.rubric]
  )

  const initial = submission?.gradingResult

  const combinedCorrectedText = useMemo(() => {
    if (!submission) return ''
    return submission.ocrPages.map((p) => p.correctedText).join('\n')
  }, [submission])

  const [rubricDraft, setRubricDraft] = useState<GradingRubricScores>(() =>
    mergeGradingScoresWithCriteria(initial?.rubric, criteria)
  )
  const [strengthsText, setStrengthsText] = useState<string>(
    normalizeStrengthsInput(initial?.strengths as unknown[] | undefined).join('\n')
  )
  const [teacherComment, setTeacherComment] = useState<string>(initial?.teacherComment ?? '')
  const [showErrors, setShowErrors] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [selectedMistakeIdx, setSelectedMistakeIdx] = useState<number | null>(null)
  
  // State for new mistake form
  const [isAddingMistake, setIsAddingMistake] = useState(false)
  const [newMistakeType, setNewMistakeType] = useState<GradingMistake['type']>('spelling')
  const [newMistakeOriginal, setNewMistakeOriginal] = useState('')
  const [newMistakeSuggestion, setNewMistakeSuggestion] = useState('')

  useEffect(() => {
    if (!initial) return
    setRubricDraft(mergeGradingScoresWithCriteria(initial.rubric, criteria))
    setStrengthsText(normalizeStrengthsInput(initial.strengths as unknown[] | undefined).join('\n'))
    setTeacherComment(initial.teacherComment ?? '')
  }, [initial?.rubric, initial?.strengths, initial?.teacherComment, criteria])

  const score = scoreFromRubricDraft(rubricDraft)
  const strengths = strengthsText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  const buildResult = (mistakesOverride?: GradingMistake[]): GradingResult | null => {
    if (!initial) return null
    return {
      ...initial,
      rubric: mergeGradingScoresWithCriteria(rubricDraft, criteria),
      score,
      strengths,
      teacherComment,
      mistakes: mistakesOverride ?? initial.mistakes
    }
  }

  // Sync back to store whenever score or comment changes
  const saveTimeout = useRef<number>()
  useEffect(() => {
    if (!initial || !submission) return
    clearTimeout(saveTimeout.current)
    saveTimeout.current = window.setTimeout(() => {
      const next = buildResult()
      if (!next) return
      const initialStrengths = normalizeStrengthsInput(initial.strengths as unknown[] | undefined).join('\n')
      const shouldSave =
        next.score !== initial.score ||
        next.teacherComment !== initial.teacherComment ||
        initialStrengths !== strengthsText ||
        !gradingRubricScoresEqual(
          mergeGradingScoresWithCriteria(next.rubric, criteria),
          mergeGradingScoresWithCriteria(initial.rubric, criteria)
        )
      if (shouldSave) {
        setGradingResult(submission.id, next)
      }
    }, TIMING.REVIEW_AUTOSAVE_DEBOUNCE_MS)
    return () => clearTimeout(saveTimeout.current)
  }, [rubricDraft, score, teacherComment, strengthsText, initial, submission, setGradingResult, criteria])

  if (!submission) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-lg font-semibold text-slate-900">{t('review.notFoundSubmission')}</div>
      </div>
    )
  }

  if (!initial) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
        <div className="text-lg font-semibold text-slate-900">{t('review.noAi')}</div>
        <p className="text-sm text-slate-600">{t('review.noAiHint')}</p>
        <button
          type="button"
          className="rounded-xl bg-emerald-600 text-white px-5 py-2 text-sm font-medium"
          onClick={() => navigate(`/submissions/${submission.id}/grading`)}
        >
          {t('review.goGrading')}
        </button>
      </div>
    )
  }

  const mistakes = initial.mistakes ?? []

  const handleDeleteMistake = (index: number) => {
    const updatedMistakes = [...mistakes]
    updatedMistakes.splice(index, 1)
    const next = buildResult(updatedMistakes)
    if (next) setGradingResult(submission.id, next)
    if (selectedMistakeIdx === index) setSelectedMistakeIdx(null)
  }

  const handleAddMistake = () => {
    if (!newMistakeOriginal.trim()) return
    const newMistake: GradingMistake = {
      type: newMistakeType,
      original: newMistakeOriginal.trim(),
      suggestion: newMistakeSuggestion.trim() || undefined
    }
    const next = buildResult([...mistakes, newMistake])
    if (next) setGradingResult(submission.id, next)
    setIsAddingMistake(false)
    setNewMistakeOriginal('')
    setNewMistakeSuggestion('')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('review.title')}</h1>
          <p className="text-sm text-slate-600 mt-1">
            {t('review.subtitlePrefix')} <strong>{submission.studentName}</strong>
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => navigate(-1)}
        >
          {t('review.back')}
        </button>
      </div>

      {/* Toggle controls */}
      <div className="flex flex-wrap gap-3 items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
        <span className="text-xs font-medium text-slate-600 mr-1">{t('review.show')}</span>
        <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-700">
          <input
            type="checkbox"
            checked={showErrors}
            onChange={(e) => setShowErrors(e.target.checked)}
            className="rounded border-slate-300 accent-red-500"
          />
          <span className="flex items-center gap-1">
            <mark className="bg-red-200 px-1 rounded text-red-900 not-italic font-medium">{t('review.errGrammar')}</mark>
          </span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-700">
          <input
            type="checkbox"
            checked={showSuggestions}
            onChange={(e) => setShowSuggestions(e.target.checked)}
            className="rounded border-slate-300 accent-yellow-500"
          />
          <span className="flex items-center gap-1">
            <mark className="bg-yellow-300 px-1 rounded text-yellow-900 not-italic font-medium">
              {t('review.errSuggestion')}
            </mark>
          </span>
        </label>
      </div>

      {/* Main 2-column layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-5 gap-4 lg:items-start lg:h-[calc(100vh-160px)]">
        
        {/* LEFT: Annotated essay */}
        <div className="lg:col-span-3 h-[60vh] lg:h-full flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-slate-800 text-sm">{t('review.essay')}</span>
            <span className="text-xs text-slate-500">{t('review.chars', { n: combinedCorrectedText.length })}</span>
          </div>
          <div className="p-5 flex-1 overflow-y-auto">
            <AnnotatedEssay
              text={combinedCorrectedText}
              mistakes={mistakes}
              showErrors={showErrors}
              showSuggestions={showSuggestions}
            />
          </div>
        </div>

        {/* RIGHT: Sidebar (Mistakes on top, Summary on bottom) */}
        <div className="lg:col-span-2 flex flex-col gap-4 lg:h-full">

          {/* Mistake list — Flexible height */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col h-[50vh] lg:h-auto lg:flex-1 lg:min-h-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="font-semibold text-slate-800 text-sm">{t('review.mistakes', { n: mistakes.length })}</span>
              <button
                type="button"
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                onClick={() => setIsAddingMistake(!isAddingMistake)}
              >
                {t('review.addMistake')}
              </button>
            </div>
            
            {isAddingMistake && (
              <div className="p-3 border-b border-slate-100 bg-emerald-50/50 space-y-2">
                <div className="flex gap-2">
                  <select
                    className="text-xs border border-slate-200 rounded px-2 py-1 w-24 bg-white"
                    value={newMistakeType}
                    onChange={(e) => setNewMistakeType(e.target.value as any)}
                  >
                    <option value="spelling">{mistakeTypeLabelVi('spelling')}</option>
                    <option value="grammar">{mistakeTypeLabelVi('grammar')}</option>
                    <option value="punctuation">{mistakeTypeLabelVi('punctuation')}</option>
                    <option value="repeat">{mistakeTypeLabelVi('repeat')}</option>
                    <option value="missing_idea">{mistakeTypeLabelVi('missing_idea')}</option>
                    <option value="structure">{mistakeTypeLabelVi('structure')}</option>
                    <option value="suggestion">{mistakeTypeLabelVi('suggestion')}</option>
                    <option value="other">{mistakeTypeLabelVi('other')}</option>
                  </select>
                  <input
                    className="text-xs border border-slate-200 rounded px-2 py-1 flex-1 min-w-0"
                    placeholder={t('review.mistakePlaceholder')}
                    value={newMistakeOriginal}
                    onChange={(e) => setNewMistakeOriginal(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    className="text-xs border border-slate-200 rounded px-2 py-1 flex-1 min-w-0"
                    placeholder={t('review.fixPlaceholder')}
                    value={newMistakeSuggestion}
                    onChange={(e) => setNewMistakeSuggestion(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddMistake}
                    disabled={!newMistakeOriginal.trim()}
                    className="text-xs bg-emerald-600 text-white px-3 py-1 rounded font-medium disabled:opacity-50"
                  >
                    {t('review.saveMistake')}
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {mistakes.length === 0 ? (
                <div className="px-4 py-6 text-xs text-slate-400 text-center">{t('review.noMistakes')}</div>
              ) : (
                mistakes.map((m, i) => (
                  <div
                    key={i}
                    className={`px-4 py-2.5 transition-colors text-xs flex group ${selectedMistakeIdx === i ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}
                  >
                    <div className="flex-1 cursor-pointer" onClick={() => setSelectedMistakeIdx(selectedMistakeIdx === i ? null : i)}>
                      <div className="flex items-start gap-2">
                        <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${mistakeTypeBadge(m.type)}`}>
                          {mistakeTypeLabelVi(m.type)}
                        </span>
                        <span className="text-slate-700 flex-1 pt-0.5 leading-relaxed">
                          <span className="text-red-600 font-medium">{m.original}</span>
                          {m.suggestion && <span className="text-slate-500"> → <span className="text-emerald-700">{m.suggestion}</span></span>}
                        </span>
                      </div>
                      {selectedMistakeIdx === i && m.explanation && (
                        <p className="mt-1.5 text-slate-500 pl-1 leading-relaxed">{m.explanation}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMistake(i)}
                      className="ml-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 px-1"
                      title={t('review.deleteMistake')}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Overview & Comment — Fixed at bottom */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex-shrink-0 flex flex-col">
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
              <span className="font-semibold text-slate-800 text-sm">{t('review.overview')}</span>
            </div>
            
            <div className="p-4 flex flex-col gap-4">
              {/* Top row: Score & Breakdown & Strengths */}
              <div className="flex flex-col xl:flex-row xl:items-stretch gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center justify-center gap-1.5 flex-shrink-0 xl:border-r border-slate-100 xl:pr-4">
                  <div className="w-16 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xl font-bold text-emerald-700 text-center">
                    {score.toFixed(1)}
                  </div>
                  <span className="text-xs text-slate-500 font-medium">/10</span>
                </div>
                
                <div className="xl:w-[32%] xl:min-w-[120px] flex flex-col justify-center xl:border-r border-slate-100 xl:pr-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600 items-center">
                    {criteria.map((c) => (
                      <React.Fragment key={c.id}>
                        <span className="leading-tight">{c.label}</span>
                        <input
                          type="number"
                          className="rounded border border-slate-200 px-2 py-1 text-right text-slate-800"
                          value={rubricDraft[c.id] ?? 0}
                          step="0.5"
                          min={0}
                          max={10}
                          onChange={(e) =>
                            setRubricDraft((prev) => ({
                              ...prev,
                              [c.id]: clampRubricValue(Number(e.target.value))
                            }))
                          }
                        />
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <div className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1 flex-shrink-0">
                    {t('review.strengths')}
                  </div>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs resize-y min-h-[84px]"
                    value={strengthsText}
                    onChange={(e) => setStrengthsText(e.target.value)}
                    placeholder={t('review.strengthsPh')}
                  />
                  <div className="text-[11px] text-slate-500 mt-1">{t('review.strengthsHint')}</div>
                  </div>
              </div>

              {/* Bottom row: Comments */}
              <div className="flex flex-col">
                <label className="flex-1 flex flex-col">
                  <span className="text-slate-600 text-sm font-medium mb-1.5 flex justify-between items-center">
                    {t('review.teacherComment')}
                    <span className="text-xs text-emerald-600 font-normal">{t('review.autosave')}</span>
                  </span>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-y min-h-[80px]"
                    value={teacherComment}
                    onChange={(e) => setTeacherComment(e.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>

        </div>
      </div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="fixed bottom-5 right-5 z-30 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700"
      >
        {t('review.back')}
      </button>
    </div>
  )
}

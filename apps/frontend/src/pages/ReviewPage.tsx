import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../state/appStore'
import type { GradingMistake, GradingResult } from '../types'

function mistakeTypeVi(t: string) {
  const map: Record<string, string> = {
    spelling: 'Chính tả',
    repeat: 'Lặp ý',
    grammar: 'Ngữ pháp',
    missing_idea: 'Thiếu ý',
    structure: 'Bố cục',
    suggestion: 'Gợi ý',
    other: 'Khác'
  }
  return map[t] ?? t.replaceAll('_', ' ')
}

function mistakeTypeBadge(t: string) {
  const colorMap: Record<string, string> = {
    spelling: 'bg-red-100 text-red-700 border-red-200',
    grammar: 'bg-orange-100 text-orange-700 border-orange-200',
    repeat: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    missing_idea: 'bg-blue-100 text-blue-700 border-blue-200',
    structure: 'bg-purple-100 text-purple-700 border-purple-200',
    suggestion: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    other: 'bg-slate-100 text-slate-600 border-slate-200'
  }
  return colorMap[t] ?? 'bg-slate-100 text-slate-600 border-slate-200'
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function createFuzzyRegex(original: string) {
  const words = original.trim().split(/[\s\.,?!;:"'()\[\]]+/).filter(Boolean)
  if (words.length === 0) return null
  const pattern = words.map(escapeRegExp).join('[\\s\\.,?!;:"\'()\\[\\]]+')
  return new RegExp(pattern, 'gi')
}

function clampRubricValue(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(10, Math.round(v * 10) / 10))
}

function scoreFromRubric(rubric: GradingResult['rubric']): number {
  const total = rubric.content + rubric.grammar + rubric.creativity + rubric.presentation
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
  interface Annotation {
    start: number
    end: number
    mistake: GradingMistake
  }

  const annotations: Annotation[] = useMemo(() => {
    const found: Annotation[] = []
    const usedRanges: [number, number][] = []

    // Sort by length ASCENDING so smaller (more specific) mistakes are highlighted first and don't get swallowed by large structural overlaps
    const sortedMistakes = [...mistakes].sort((a, b) => (a.original?.length || 0) - (b.original?.length || 0))

    for (const m of sortedMistakes) {
      if (!m.original || m.original.length < 2) continue
      
      let foundMatch = false
      const regex = createFuzzyRegex(m.original)
      
      if (regex) {
        const matches = [...text.matchAll(regex)]
        for (const match of matches) {
          const start = match.index!
          const end = start + match[0].length
          const overlaps = usedRanges.some(([s, e]) => start < e && end > s)
          if (!overlaps) {
            found.push({ start, end, mistake: m })
            usedRanges.push([start, end])
            foundMatch = true
            break
          }
        }
      }

      if (!foundMatch) {
        let cursor = 0
        while (true) {
          const start = text.indexOf(m.original, cursor)
          if (start === -1) break
          const end = start + m.original.length
          const overlaps = usedRanges.some(([s, e]) => start < e && end > s)
          if (!overlaps) {
            found.push({ start, end, mistake: m })
            usedRanges.push([start, end])
            break
          }
          cursor = start + 1
        }
      }
    }

    return found.sort((a, b) => a.start - b.start)
  }, [text, mistakes])

  if (!showErrors && !showSuggestions) {
    return <p className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">{text}</p>
  }

  const segments: React.ReactNode[] = []
  let cursor = 0

  for (const ann of annotations) {
    const { start, end, mistake } = ann
    const isSpellingOrGrammar = mistake.type === 'spelling' || mistake.type === 'grammar'
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
  const navigate = useNavigate()
  const { submissionId } = useParams()

  const submissions = useAppStore((s) => s.submissions)
  const setGradingResult = useAppStore((s) => s.setGradingResult)

  const submission = submissions.find((s) => s.id === submissionId)
  const initial = submission?.gradingResult

  const combinedCorrectedText = useMemo(() => {
    if (!submission) return ''
    return submission.ocrPages.map((p) => p.correctedText).join('\n')
  }, [submission])

  const [rubricDraft, setRubricDraft] = useState<GradingResult['rubric']>(
    initial?.rubric ?? { content: 0, grammar: 0, creativity: 0, presentation: 0 }
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
    setRubricDraft(initial.rubric)
    setStrengthsText(normalizeStrengthsInput(initial.strengths as unknown[] | undefined).join('\n'))
    setTeacherComment(initial.teacherComment ?? '')
  }, [initial?.rubric, initial?.strengths, initial?.teacherComment])

  const score = scoreFromRubric(rubricDraft)
  const strengths = strengthsText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  const buildResult = (mistakesOverride?: GradingMistake[]): GradingResult | null => {
    if (!initial) return null
    return {
      ...initial,
      rubric: rubricDraft,
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
        next.rubric.content !== initial.rubric.content ||
        next.rubric.grammar !== initial.rubric.grammar ||
        next.rubric.creativity !== initial.rubric.creativity ||
        next.rubric.presentation !== initial.rubric.presentation
      if (shouldSave) {
        setGradingResult(submission.id, next)
      }
    }, 500)
    return () => clearTimeout(saveTimeout.current)
  }, [rubricDraft, score, teacherComment, strengthsText, initial, submission, setGradingResult])

  if (!submission) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-lg font-semibold text-slate-900">Không tìm thấy bài làm</div>
      </div>
    )
  }

  if (!initial) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
        <div className="text-lg font-semibold text-slate-900">Chưa có kết quả AI</div>
        <p className="text-sm text-slate-600">Quay lại bước chấm và chạy AI trước.</p>
        <button
          type="button"
          className="rounded-xl bg-emerald-600 text-white px-5 py-2 text-sm font-medium"
          onClick={() => navigate(`/submissions/${submission.id}/grading`)}
        >
          Đến màn chấm AI
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
          <h1 className="text-2xl font-semibold text-slate-900">Duyệt kết quả</h1>
          <p className="text-sm text-slate-600 mt-1">
            Học sinh: <strong>{submission.studentName}</strong>
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => navigate(-1)}
        >
          ← Trở lại
        </button>
      </div>

      {/* Toggle controls */}
      <div className="flex flex-wrap gap-3 items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
        <span className="text-xs font-medium text-slate-600 mr-1">Hiển thị:</span>
        <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-700">
          <input
            type="checkbox"
            checked={showErrors}
            onChange={(e) => setShowErrors(e.target.checked)}
            className="rounded border-slate-300 accent-red-500"
          />
          <span className="flex items-center gap-1">
            <mark className="bg-red-200 px-1 rounded text-red-900 not-italic font-medium">Lỗi chính tả / ngữ pháp</mark>
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
            <mark className="bg-yellow-300 px-1 rounded text-yellow-900 not-italic font-medium">Gợi ý cải thiện</mark>
          </span>
        </label>
      </div>

      {/* Main 2-column layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-5 gap-4 lg:items-start lg:h-[calc(100vh-160px)]">
        
        {/* LEFT: Annotated essay */}
        <div className="lg:col-span-3 h-[60vh] lg:h-full flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="font-semibold text-slate-800 text-sm">Bài làm</span>
            <span className="text-xs text-slate-500">{combinedCorrectedText.length} ký tự</span>
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
              <span className="font-semibold text-slate-800 text-sm">Danh sách lỗi ({mistakes.length})</span>
              <button
                type="button"
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                onClick={() => setIsAddingMistake(!isAddingMistake)}
              >
                + Thêm lỗi
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
                    <option value="spelling">Chính tả</option>
                    <option value="grammar">Ngữ pháp</option>
                    <option value="repeat">Lặp ý</option>
                    <option value="missing_idea">Thiếu ý</option>
                    <option value="structure">Bố cục</option>
                    <option value="suggestion">Gợi ý</option>
                    <option value="other">Khác</option>
                  </select>
                  <input
                    className="text-xs border border-slate-200 rounded px-2 py-1 flex-1 min-w-0"
                    placeholder="Câu/Từ gốc..."
                    value={newMistakeOriginal}
                    onChange={(e) => setNewMistakeOriginal(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    className="text-xs border border-slate-200 rounded px-2 py-1 flex-1 min-w-0"
                    placeholder="Sửa thành (không bắt buộc)..."
                    value={newMistakeSuggestion}
                    onChange={(e) => setNewMistakeSuggestion(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddMistake}
                    disabled={!newMistakeOriginal.trim()}
                    className="text-xs bg-emerald-600 text-white px-3 py-1 rounded font-medium disabled:opacity-50"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {mistakes.length === 0 ? (
                <div className="px-4 py-6 text-xs text-slate-400 text-center">Không có lỗi nào 🎉</div>
              ) : (
                mistakes.map((m, i) => (
                  <div
                    key={i}
                    className={`px-4 py-2.5 transition-colors text-xs flex group ${selectedMistakeIdx === i ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}
                  >
                    <div className="flex-1 cursor-pointer" onClick={() => setSelectedMistakeIdx(selectedMistakeIdx === i ? null : i)}>
                      <div className="flex items-start gap-2">
                        <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${mistakeTypeBadge(m.type)}`}>
                          {mistakeTypeVi(m.type)}
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
                      title="Xóa lỗi này"
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
              <span className="font-semibold text-slate-800 text-sm">Tổng quan & Điểm</span>
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
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600 items-center">
                    <span>Nội dung</span>
                    <input
                      type="number"
                      className="rounded border border-slate-200 px-2 py-1 text-right text-slate-800"
                      value={rubricDraft.content}
                      step="0.5"
                      min={0}
                      max={10}
                      onChange={(e) =>
                        setRubricDraft((prev) => ({ ...prev, content: clampRubricValue(Number(e.target.value)) }))
                      }
                    />
                    <span>Ngữ pháp</span>
                    <input
                      type="number"
                      className="rounded border border-slate-200 px-2 py-1 text-right text-slate-800"
                      value={rubricDraft.grammar}
                      step="0.5"
                      min={0}
                      max={10}
                      onChange={(e) =>
                        setRubricDraft((prev) => ({ ...prev, grammar: clampRubricValue(Number(e.target.value)) }))
                      }
                    />
                    <span>Sáng tạo</span>
                    <input
                      type="number"
                      className="rounded border border-slate-200 px-2 py-1 text-right text-slate-800"
                      value={rubricDraft.creativity}
                      step="0.5"
                      min={0}
                      max={10}
                      onChange={(e) =>
                        setRubricDraft((prev) => ({
                          ...prev,
                          creativity: clampRubricValue(Number(e.target.value))
                        }))
                      }
                    />
                    <span>Trình bày</span>
                    <input
                      type="number"
                      className="rounded border border-slate-200 px-2 py-1 text-right text-slate-800"
                      value={rubricDraft.presentation}
                      step="0.5"
                      min={0}
                      max={10}
                      onChange={(e) =>
                        setRubricDraft((prev) => ({
                          ...prev,
                          presentation: clampRubricValue(Number(e.target.value))
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <div className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1 flex-shrink-0">✨ Điểm mạnh</div>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs resize-y min-h-[84px]"
                    value={strengthsText}
                    onChange={(e) => setStrengthsText(e.target.value)}
                    placeholder="Mỗi dòng 1 ý ngắn, đúng trọng tâm"
                  />
                  <div className="text-[11px] text-slate-500 mt-1">Mỗi dòng sẽ là một điểm mạnh.</div>
                  </div>
              </div>

              {/* Bottom row: Comments */}
              <div className="flex flex-col">
                <label className="flex-1 flex flex-col">
                  <span className="text-slate-600 text-sm font-medium mb-1.5 flex justify-between items-center">
                    Nhận xét giáo viên
                    <span className="text-xs text-emerald-600 font-normal">Tự động lưu</span>
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
        ← Trở lại
      </button>
    </div>
  )
}

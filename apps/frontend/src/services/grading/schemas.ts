import { z } from 'zod'

import type { RubricCriterion } from '../../lib/rubric'
import {
  emptyScoresForCriteria,
  pickRubricScoresForCriteria,
  sumGradingScores
} from '../../lib/rubric'
import type { GradingMistake, GradingResult } from '../../types'

const MISTAKE_TYPES = new Set<GradingMistake['type']>([
  'spelling',
  'repeat',
  'grammar',
  'punctuation',
  'missing_idea',
  'structure',
  'suggestion',
  'other'
])

function coerceMistakeType(raw: unknown): GradingMistake['type'] {
  if (typeof raw === 'string' && MISTAKE_TYPES.has(raw as GradingMistake['type'])) {
    return raw as GradingMistake['type']
  }
  return 'other'
}

function coerceFiniteNumber(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function clampScore10(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10))
}

function asObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  return {}
}

function normalizeStrengthsField(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter((s) => s.length > 0)
}

/** Một mục mistakes: bỏ qua phần tử không phải object; thiếu/không hợp lệ → other + original rỗng. */
export function parseGradingMistakeLoose(m: unknown): GradingMistake {
  const o = asObject(m)
  return {
    type: coerceMistakeType(o.type),
    original: typeof o.original === 'string' ? o.original : '',
    suggestion: typeof o.suggestion === 'string' ? o.suggestion : undefined,
    explanation: typeof o.explanation === 'string' ? o.explanation : undefined
  }
}

export function emptyGradingResult(criteria: RubricCriterion[]): GradingResult {
  return {
    score: 0,
    rubric: emptyScoresForCriteria(criteria),
    strengths: [],
    mistakes: [],
    rewriteSuggestion: '',
    teacherComment: ''
  }
}

/**
 * Chuẩn hoá một object kết quả chấm từ AI (thiếu/thừa trường đều được xử lý).
 * Rubric: chỉ giữ tiêu chí của đề; số không hợp lệ → 0.
 */
export function normalizeAiGradingRow(raw: unknown, criteria: RubricCriterion[]): GradingResult {
  const o = asObject(raw)

  const rubricLoose: Record<string, number> = {}
  const rubVal = o.rubric
  if (rubVal && typeof rubVal === 'object' && !Array.isArray(rubVal)) {
    for (const [k, v] of Object.entries(rubVal as Record<string, unknown>)) {
      const n = coerceFiniteNumber(v)
      if (n !== undefined) rubricLoose[k] = n
    }
  }
  const rubric = pickRubricScoresForCriteria(rubricLoose, criteria)

  let score = coerceFiniteNumber(o.score) ?? NaN
  if (!Number.isFinite(score)) {
    score = sumGradingScores(rubric)
  }
  score = clampScore10(score)

  const strengths = normalizeStrengthsField(o.strengths)

  const mistakesRaw = o.mistakes
  const mistakes: GradingMistake[] = Array.isArray(mistakesRaw) ? mistakesRaw.map(parseGradingMistakeLoose) : []

  const rewriteSuggestion = typeof o.rewriteSuggestion === 'string' ? o.rewriteSuggestion : ''
  const teacherComment = typeof o.teacherComment === 'string' ? o.teacherComment : ''

  return {
    score,
    rubric,
    strengths,
    mistakes,
    rewriteSuggestion,
    teacherComment
  }
}

/** JSON gốc một bài (Gemini có thể thêm/bớt key — strip qua asObject). */
export const GeminiSingleGradingRootLooseSchema: z.ZodType<Record<string, unknown>> = z
  .unknown()
  .transform(asObject)

/** JSON batch `{ results: [...] }` — results không phải mảng → []. */
export const GeminiBatchGradingRootLooseSchema: z.ZodType<{ results: unknown[] }> = z
  .unknown()
  .transform((v) => {
    const o = asObject(v)
    const r = o.results
    return { results: Array.isArray(r) ? r : [] }
  })

export function extractSubmissionIdFromBatchRow(row: unknown): string {
  const o = asObject(row)
  const id = o.submissionId
  return typeof id === 'string' ? id.trim() : ''
}

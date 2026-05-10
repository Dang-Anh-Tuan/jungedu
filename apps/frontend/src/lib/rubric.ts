/** Một đầu mục trong rubric bài kiểm tra (nhãn + trọng số tối đa / phần điểm). */
export type RubricCriterion = {
  id: string
  label: string
  weight: number
}

/** Điểm theo từng tiêu chí (id → điểm nhận được). */
export type GradingRubricScores = Record<string, number>

export const DEFAULT_RUBRIC_CRITERIA: RubricCriterion[] = [
  { id: 'content', label: 'Nội dung', weight: 4 },
  { id: 'grammar', label: 'Ngữ pháp / diễn đạt', weight: 2 },
  { id: 'creativity', label: 'Sáng tạo', weight: 2 },
  { id: 'presentation', label: 'Trình bày', weight: 2 }
]

export function createRubricCriterionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

export function totalRubricWeight(criteria: RubricCriterion[]): number {
  return criteria.reduce((s, c) => s + (Number.isFinite(c.weight) ? c.weight : 0), 0)
}

export function sumGradingScores(scores: GradingRubricScores): number {
  return Object.values(scores).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)
}

export function emptyScoresForCriteria(criteria: RubricCriterion[]): GradingRubricScores {
  return Object.fromEntries(criteria.map((c) => [c.id, 0]))
}

export function mergeGradingScoresWithCriteria(
  stored: GradingRubricScores | undefined,
  criteria: RubricCriterion[]
): GradingRubricScores {
  const base = emptyScoresForCriteria(criteria)
  if (!stored) return base
  for (const c of criteria) {
    const v = stored[c.id]
    if (typeof v === 'number' && Number.isFinite(v)) base[c.id] = v
  }
  return base
}

/** Chuẩn hoá rubric đề bài từ Firestore (mảng tiêu chí hoặc object 4 trường cũ). */
export function normalizeExamRubricFromFirestore(raw: unknown): RubricCriterion[] {
  if (Array.isArray(raw)) {
    const items: RubricCriterion[] = []
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const o = item as Record<string, unknown>
      const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : ''
      const label = typeof o.label === 'string' && o.label.trim() ? o.label.trim() : ''
      const weight = typeof o.weight === 'number' && Number.isFinite(o.weight) ? Math.max(0, o.weight) : 0
      if (id && label) items.push({ id, label, weight })
    }
    if (items.length > 0) return items
  }
  if (raw && typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    if ('content' in o && typeof o.content === 'number') {
      return DEFAULT_RUBRIC_CRITERIA.map((c) => ({
        ...c,
        weight: typeof o[c.id] === 'number' && Number.isFinite(o[c.id] as number) ? (o[c.id] as number) : c.weight
      }))
    }
  }
  return DEFAULT_RUBRIC_CRITERIA.map((c) => ({ ...c }))
}

/** Chuẩn hoá điểm rubric trong kết quả chấm (record động hoặc 4 trường cũ). */
export function normalizeGradingRubricScoresFromFirestore(raw: unknown): GradingRubricScores {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const o = raw as Record<string, unknown>
  const legacyKeys = ['content', 'grammar', 'creativity', 'presentation'] as const
  const looksLegacy = legacyKeys.every((k) => k in o)
  if (looksLegacy) {
    const out: GradingRubricScores = {}
    for (const k of legacyKeys) {
      const v = o[k]
      out[k] = typeof v === 'number' && Number.isFinite(v) ? v : 0
    }
    return out
  }
  const out: GradingRubricScores = {}
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  return out
}

export function gradingRubricScoresEqual(a: GradingRubricScores, b: GradingRubricScores): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    const av = a[k]
    const bv = b[k]
    if ((typeof av === 'number' ? av : NaN) !== (typeof bv === 'number' ? bv : NaN)) return false
  }
  return true
}

/** Giữ đúng các khóa tiêu chí của đề; phần còn thiếu coi là 0. */
export function pickRubricScoresForCriteria(
  parsed: Record<string, number>,
  criteria: RubricCriterion[]
): GradingRubricScores {
  const out: GradingRubricScores = {}
  for (const c of criteria) {
    const v = parsed[c.id]
    out[c.id] = typeof v === 'number' && Number.isFinite(v) ? v : 0
  }
  return out
}

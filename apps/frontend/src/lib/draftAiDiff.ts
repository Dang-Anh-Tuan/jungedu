/** Diff nhẹ để highlight phần bản sửa khác với văn bản AI (ocrText). */

export type DraftDiffSegment = { kind: 'same' | 'diff'; text: string }

function mergeAdjacent(segments: DraftDiffSegment[]): DraftDiffSegment[] {
  const out: DraftDiffSegment[] = []
  for (const seg of segments) {
    if (!seg.text) continue
    const prev = out[out.length - 1]
    if (prev && prev.kind === seg.kind) prev.text += seg.text
    else out.push({ kind: seg.kind, text: seg.text })
  }
  return out
}

/** LCS trên mảng phần tử — O(nm); chỉ dùng khi nm nhỏ. */
function lcsDiffArrays<T>(a: T[], b: T[], equal: (x: T, y: T) => boolean): DraftDiffSegment[] {
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (equal(a[i - 1], b[j - 1])) dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  type Piece = { kind: 'same' | 'diff'; text: string }
  const stack: Piece[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && equal(a[i - 1], b[j - 1])) {
      stack.push({ kind: 'same', text: String(b[j - 1]) })
      i--
      j--
    } else if (i > 0 && j > 0 && dp[i - 1][j] >= dp[i][j - 1]) {
      i--
    } else if (j > 0) {
      stack.push({ kind: 'diff', text: String(b[j - 1]) })
      j--
    } else {
      i--
    }
  }

  const forward: Piece[] = []
  for (let k = stack.length - 1; k >= 0; k--) forward.push(stack[k])
  return mergeAdjacent(forward)
}

function tokenizeLoose(s: string): string[] {
  return s.match(/\s+|[^\s]+/g) ?? []
}

/**
 * So khớp `draft` với `aiText`; trả các đoạn của **draft** — `diff` là chỗ khác AI (thêm/sửa).
 */
export function computeDraftVsAiSegments(aiText: string, draft: string): DraftDiffSegment[] {
  const ai = aiText ?? ''
  const d = draft ?? ''
  if (!ai.trim()) {
    if (!d) return []
    return [{ kind: 'diff', text: d }]
  }
  if (ai === d) return [{ kind: 'same', text: d }]
  if (!d) return []

  const n = ai.length
  const m = d.length
  const MAX_PROD = 850_000
  if (n * m <= MAX_PROD) {
    const charsA = [...ai]
    const charsB = [...d]
    return lcsDiffArrays(charsA, charsB, (x, y) => x === y)
  }

  const ta = tokenizeLoose(ai)
  const tb = tokenizeLoose(d)
  if (ta.length * tb.length <= MAX_PROD) {
    return lcsDiffArrays(ta, tb, (x, y) => x === y)
  }
  return [{ kind: 'diff', text: d }]
}

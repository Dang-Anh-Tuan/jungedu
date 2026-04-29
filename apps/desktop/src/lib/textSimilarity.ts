const LEV_CAP = 6000

function cappedForCompare(s: string): string {
  if (s.length <= LEV_CAP) return s
  const half = Math.floor(LEV_CAP / 2)
  return `${s.slice(0, half)}\n…\n${s.slice(-half)}`
}

/** Độ tương đồng 0…1 giữa hai chuỗi (Levenshtein chuẩn hóa theo độ dài). */
export function textSimilarityRatio(a: string, b: string): number {
  const s1 = cappedForCompare(a ?? '')
  const s2 = cappedForCompare(b ?? '')
  if (s1.length === 0 && s2.length === 0) return 1
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1
  const dist = levenshteinDistance(s1, s2)
  return 1 - dist / maxLen
}

/** Trung bình có trọng số theo độ dài (ưu tiên trang dài). Trả về 0–100 hoặc null nếu không có dữ liệu. */
export function submissionAiMatchPercent(pages: { ocrText: string; correctedText: string }[]): number | null {
  if (pages.length === 0) return null
  let weightSum = 0
  let weighted = 0
  for (const p of pages) {
    const ai = p.ocrText ?? ''
    const fix = p.correctedText ?? ''
    const w = Math.max(ai.length, fix.length, 1)
    weightSum += w
    weighted += textSimilarityRatio(ai, fix) * w
  }
  if (weightSum === 0) return null
  return Math.round((weighted / weightSum) * 100)
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const v0 = new Array<number>(n + 1)
  const v1 = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) v0[j] = j
  for (let i = 0; i < m; i++) {
    v1[0] = i + 1
    for (let j = 0; j < n; j++) {
      const cost = a.charCodeAt(i) === b.charCodeAt(j) ? 0 : 1
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost)
    }
    for (let j = 0; j <= n; j++) v0[j] = v1[j]
  }
  return v0[n]
}

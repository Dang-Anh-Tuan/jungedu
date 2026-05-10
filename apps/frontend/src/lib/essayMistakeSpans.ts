import { LIMITS } from '../config/constants'
import type { GradingMistake } from '../types'

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Khớp lỗi lỏng theo từ (cho phép khác khoảng trắng / dấu câu) — đồng bộ UI Review và PDF. */
function createFuzzyRegex(original: string) {
  const words = original.trim().split(/[\s\.,?!;:"'()\[\]]+/).filter(Boolean)
  if (words.length === 0) return null
  const pattern = words.map(escapeRegExp).join('[\\s\\.,?!;:"\'()\\[\\]]+')
  return new RegExp(pattern, 'gi')
}

export type MistakeSpan = { start: number; end: number; mistake: GradingMistake }

/**
 * Xác định các đoạn trong bài cần gắn với từng mistake (không chồng lấn).
 * Dùng chung ReviewPage và export PDF để danh sách lỗi + highlight khớp nhau.
 */
export function resolveMistakeSpans(
  text: string,
  mistakes: GradingMistake[],
  minOriginalLen = LIMITS.MISTAKE_ORIGINAL_MIN_LEN
): MistakeSpan[] {
  const found: MistakeSpan[] = []
  const usedRanges: [number, number][] = []

  const sortedMistakes = [...mistakes].sort((a, b) => (a.original?.length || 0) - (b.original?.length || 0))

  for (const m of sortedMistakes) {
    if (!m.original || m.original.length < minOriginalLen) continue

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
}

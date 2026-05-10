import i18n from 'i18next'
import { z } from 'zod'

import { GEMINI_VISION_MODEL } from '../../config/env'
import { LIMITS, TIMING } from '../../config/constants'
import { buildVisionBatchInstruction } from '../../prompts/visionBatch'
import { callGeminiJsonWithParts } from '../grading/geminiJson'

import { fileToGeminiInlineData } from './geminiInlineData'

export type VisionBatchSegment = {
  submissionId: string
  studentId: string
  imageName: string
  file: File
}

const BatchVisionSchema = z.object({
  pages: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      text: z.string()
    })
  )
})

export type OcrPageRow = {
  imageName: string
  ocrText: string
  confidence: number
  correctedText: string
}

function mergeVisionBySubmission(a: Map<string, OcrPageRow[]>, b: Map<string, OcrPageRow[]>): void {
  for (const [submissionId, rows] of b) {
    const prev = a.get(submissionId)
    if (prev) prev.push(...rows)
    else a.set(submissionId, rows.slice())
  }
}

function chunkSegments(segments: VisionBatchSegment[], chunkSize: number): VisionBatchSegment[][] {
  if (chunkSize <= 0) return [segments]
  const out: VisionBatchSegment[][] = []
  for (let i = 0; i < segments.length; i += chunkSize) {
    out.push(segments.slice(i, i + chunkSize))
  }
  return out
}

/** Một request Gemini cho một đoạn ảnh (index 0..n-1 trong chunk). */
async function runGeminiVisionBatchChunk(segments: VisionBatchSegment[]): Promise<Map<string, OcrPageRow[]>> {
  if (segments.length === 0) {
    return new Map()
  }

  const indexLines = segments.map((s, i) => `${i}. Học sinh (id nội bộ): ${s.studentId} — file: ${s.imageName}`)
  const introText = buildVisionBatchInstruction(indexLines)

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: introText }]

  for (let i = 0; i < segments.length; i++) {
    parts.push({ text: `IMAGE_INDEX: ${i}` })
    const { data, mimeType } = await fileToGeminiInlineData(segments[i].file)
    parts.push({ inlineData: { mimeType, data } })
  }

  const parsed = await callGeminiJsonWithParts({
    parts,
    schema: BatchVisionSchema,
    model: GEMINI_VISION_MODEL,
    temperature: 0.15,
    maxOutputTokens: LIMITS.BATCH_VISION_MAX_TOKENS,
    timeoutMs: TIMING.AI_BULK_TIMEOUT_MS,
    jsonFollowup: ''
  })

  const seen = new Set<number>()
  for (const p of parsed.pages) {
    if (p.index >= segments.length) {
      throw new Error(i18n.t('errors.geminiBatchVisionInvalid'))
    }
    if (seen.has(p.index)) {
      throw new Error(i18n.t('errors.geminiBatchVisionInvalid'))
    }
    seen.add(p.index)
  }
  if (seen.size !== segments.length) {
    throw new Error(i18n.t('errors.geminiBatchVisionInvalid'))
  }

  const bySubmission = new Map<string, OcrPageRow[]>()

  const sortedPages = [...parsed.pages].sort((a, b) => a.index - b.index)
  for (const p of sortedPages) {
    const seg = segments[p.index]
    const row: OcrPageRow = {
      imageName: seg.imageName,
      ocrText: p.text,
      confidence: -1,
      correctedText: p.text
    }
    const list = bySubmission.get(seg.submissionId)
    if (list) list.push(row)
    else bySubmission.set(seg.submissionId, [row])
  }

  return bySubmission
}

/**
 * OCR hàng loạt: tự chia theo `LIMITS.BULK_VISION_IMAGES_PER_CHUNK` nếu quá nhiều ảnh,
 * gộp kết quả theo `submissionId` (giữ thứ tự ảnh theo thứ tự segment ban đầu).
 */
export async function runGeminiVisionBatch(segments: VisionBatchSegment[]): Promise<Map<string, OcrPageRow[]>> {
  if (segments.length === 0) {
    return new Map()
  }

  const size = LIMITS.BULK_VISION_IMAGES_PER_CHUNK
  const chunks = chunkSegments(segments, size)
  const merged = new Map<string, OcrPageRow[]>()
  for (const part of chunks) {
    const map = await runGeminiVisionBatchChunk(part)
    mergeVisionBySubmission(merged, map)
  }
  return merged
}

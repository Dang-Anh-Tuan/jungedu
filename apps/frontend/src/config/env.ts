/**
 * Đọc biến môi trường Vite — AI: Google Gemini (API key), tuỳ chọn OpenAI cho vision.
 */
export type ImageToTextProviderId = 'gemini' | 'openai'

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'

/** Chuẩn hoá id model (bỏ prefix `google/` nếu copy từ Puter cũ). */
export function normalizeGeminiModelId(raw: string | undefined, fallback: string): string {
  const s = (raw ?? fallback).trim()
  if (s.startsWith('google/')) return s.slice('google/'.length)
  return s || fallback
}

function normalizeImageToTextProvider(raw: string | undefined): ImageToTextProviderId {
  const v = (raw ?? 'gemini').trim().toLowerCase()
  /** Legacy `.env` từng dùng `puter` */
  if (v === 'puter' || v === 'gemini' || v === 'google') return 'gemini'
  if (v === 'openai') return 'openai'
  return 'gemini'
}

/** API key Google AI Studio / Gemini API — bắt buộc cho chấm điểm & OCR khi dùng Gemini. */
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

export const GEMINI_GRADING_MODEL = normalizeGeminiModelId(
  import.meta.env.VITE_GEMINI_GRADING_MODEL || import.meta.env.VITE_GEMINI_MODEL,
  DEFAULT_GEMINI_MODEL
)

export const GEMINI_VISION_MODEL = normalizeGeminiModelId(
  import.meta.env.VITE_GEMINI_VISION_MODEL || import.meta.env.VITE_GEMINI_MODEL,
  DEFAULT_GEMINI_MODEL
)

export const IMAGE_TO_TEXT_PROVIDER = normalizeImageToTextProvider(import.meta.env.VITE_IMAGE_TO_TEXT_PROVIDER)

export type SubmissionImageStorageMode = 'firebase' | 'local' | 'gdrive'

export function getSubmissionImageStorageMode(): SubmissionImageStorageMode {
  const v = (import.meta.env.VITE_SUBMISSION_IMAGE_STORAGE ?? 'firebase').trim().toLowerCase()
  if (v === 'local') return 'local'
  if (v === 'gdrive' || v === 'drive' || v === 'google-drive') return 'gdrive'
  return 'firebase'
}

export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
export const OPENAI_API_BASE = import.meta.env.VITE_OPENAI_API_BASE || 'https://api.openai.com/v1'
export const OPENAI_VISION_MODEL = import.meta.env.VITE_OPENAI_VISION_MODEL || 'gemini-2.5-flash'

export function describeImageToTextBackend(): string {
  switch (IMAGE_TO_TEXT_PROVIDER) {
    case 'gemini':
      return `Gemini (${GEMINI_VISION_MODEL})`
    case 'openai':
      return `OpenAI Vision (${OPENAI_VISION_MODEL})`
    default:
      return String(IMAGE_TO_TEXT_PROVIDER)
  }
}

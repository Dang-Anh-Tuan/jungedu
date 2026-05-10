/**
 * Đọc biến môi trường Vite — một chỗ để sau này thay provider (Puter → OpenAI, Firebase → API).
 */
export type ImageToTextProviderId = 'puter' | 'openai'

function normalizeImageToTextProvider(raw: string | undefined): ImageToTextProviderId {
  const v = (raw ?? 'puter').trim().toLowerCase()
  if (v === 'puter' || v === 'openai') return v
  return 'puter'
}

export const PUTER_GRADING_MODEL = import.meta.env.VITE_PUTER_GRADING_MODEL || 'google/gemini-2.5-flash'

export const IMAGE_TO_TEXT_PROVIDER = normalizeImageToTextProvider(import.meta.env.VITE_IMAGE_TO_TEXT_PROVIDER)

export const PUTER_VISION_MODEL = import.meta.env.VITE_PUTER_VISION_MODEL || 'google/gemini-2.5-flash'

export type SubmissionImageStorageMode = 'firebase' | 'local' | 'gdrive'

export function getSubmissionImageStorageMode(): SubmissionImageStorageMode {
  const v = (import.meta.env.VITE_SUBMISSION_IMAGE_STORAGE ?? 'firebase').trim().toLowerCase()
  if (v === 'local') return 'local'
  if (v === 'gdrive' || v === 'drive' || v === 'google-drive') return 'gdrive'
  return 'firebase'
}

export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
export const OPENAI_API_BASE = import.meta.env.VITE_OPENAI_API_BASE || 'https://api.openai.com/v1'
export const OPENAI_VISION_MODEL = import.meta.env.VITE_OPENAI_VISION_MODEL || 'google/gemini-2.5-flash'

export function describeImageToTextBackend(): string {
  switch (IMAGE_TO_TEXT_PROVIDER) {
    case 'puter':
      return `Puter AI vision (${PUTER_VISION_MODEL})`
    case 'openai':
      return `OpenAI Vision (${OPENAI_VISION_MODEL})`
    default:
      return String(IMAGE_TO_TEXT_PROVIDER)
  }
}

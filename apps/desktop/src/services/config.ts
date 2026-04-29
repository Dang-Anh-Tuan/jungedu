/** Model Puter cho bước lành text OCR trước khi chấm (JSON correctedText). */
export const PUTER_CLEANUP_MODEL = import.meta.env.VITE_PUTER_CLEANUP_MODEL || 'gpt-4o-mini'

/** Model Puter cho bước chấm rubric + nhận xét (JSON GradingResult). */
export const PUTER_GRADING_MODEL = import.meta.env.VITE_PUTER_GRADING_MODEL || 'gpt-4o-mini'

/** Backend chuyển ảnh → text: puter ([Puter.js](https://developer.puter.com)), openai (API chính thức). */
export type ImageToTextProviderId = 'puter' | 'openai'

function normalizeImageToTextProvider(raw: string | undefined): ImageToTextProviderId {
  const v = (raw ?? 'puter').trim().toLowerCase()
  if (v === 'puter' || v === 'openai') return v
  return 'puter'
}

/** Mặc định `puter` — vision qua Puter.js (không cần OpenAI API key trong repo). */
export const IMAGE_TO_TEXT_PROVIDER = normalizeImageToTextProvider(import.meta.env.VITE_IMAGE_TO_TEXT_PROVIDER)

/** Vision mặc định `gpt-4o` — đọc ảnh tốt hơn mini; có thể đặt `gpt-4o-mini` trong env để tiết kiệm. */
export const PUTER_VISION_MODEL = import.meta.env.VITE_PUTER_VISION_MODEL || 'gpt-4o'

/** Chỉ khi `VITE_IMAGE_TO_TEXT_PROVIDER=openai` — không commit key thật; production nên proxy qua backend. */
export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
export const OPENAI_API_BASE = import.meta.env.VITE_OPENAI_API_BASE || 'https://api.openai.com/v1'
export const OPENAI_VISION_MODEL = import.meta.env.VITE_OPENAI_VISION_MODEL || 'gpt-4o'

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

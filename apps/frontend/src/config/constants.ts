/**
 * Hằng số tập trung (thời gian, giới hạn) — không nhét magic number rải rác.
 * Biến môi trường / vendor vẫn nằm trong `config/env.ts`.
 */
export const TIMING = {
  /** Gọi AI chat (Gemini / OpenAI). */
  AI_CHAT_TIMEOUT_MS: 3 * 60 * 1000,
  /** Tự lưu kinh nghiệm chấm trên trang Cài đặt. */
  TEACHER_EXPERIENCE_DEBOUNCE_MS: 650,
  /** Tự lưu màn duyệt chấm. */
  REVIEW_AUTOSAVE_DEBOUNCE_MS: 500,
  /** OCR confirm — ghi correctedText khi gõ. */
  OCR_DRAFT_SAVE_MS: 450,
  /** Sonner Toaster (AppLayout). */
  TOAST_DURATION_MS: 4200
} as const

export const LIMITS = {
  /** Ký tự tối thiểu để coi là đoạn trích lỗi (Review). */
  MISTAKE_ORIGINAL_MIN_LEN: 2,
  /** maxOutputTokens khi gọi Gemini chấm điểm. */
  GRADING_MAX_TOKENS: 8192
} as const

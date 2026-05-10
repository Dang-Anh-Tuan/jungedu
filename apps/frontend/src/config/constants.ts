/**
 * Hằng số tập trung (thời gian, giới hạn) — không nhét magic number rải rác.
 * Biến môi trường / vendor vẫn nằm trong `config/env.ts`.
 */
export const TIMING = {
  /** Gọi AI chat (Gemini / OpenAI). */
  AI_CHAT_TIMEOUT_MS: 3 * 60 * 1000,
  /**
   * Một lần gọi AI cho cả lớp (OCR / chấm hàng loạt).
   * Lớp ~40–45 HS: multimodal nhiều ảnh + JSON dài thường 3–15+ phút; đệm mạng / hàng đợi → ~20 phút.
   */
  AI_BULK_TIMEOUT_MS: 20 * 60 * 1000,
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
  /** maxOutputTokens khi gọi Gemini chấm điểm (một bài). */
  GRADING_MAX_TOKENS: 8192,
  /**
   * Chấm cả lớp một phát: gemini-2.5-flash trần output ~65k token.
   * ~40–45 bài × (rubric + mistakes + nhận xét) dễ ~40–60k+ token — dùng trần API; nếu cắt cụt cần tách batch trong code.
   */
  BATCH_GRADING_MAX_TOKENS: 65536,
  /**
   * OCR hàng loạt: mỗi ảnh → một chuỗi `text` trong JSON; lớp 40–45 HS × 1–2 trang cần output lớn.
   * Đồng bộ trần flash (~65k) để tránh cắt giữa chừng khi dùng một request cho cả lớp.
   */
  BATCH_VISION_MAX_TOKENS: 65536,
  /**
   * OCR hàng loạt: tối đa ảnh / một request (vượt thì tự chia nhiều request, gộp kết quả).
   * Multimodal + JSON dài — giữ mỗi chunk vừa context/output.
   */
  BULK_VISION_IMAGES_PER_CHUNK: 20,
  /**
   * Chấm hàng loạt: tối đa số bài / một request (output trần ~65k token; chừa biên cho bài dài).
   */
  BULK_GRADING_SUBMISSIONS_PER_CHUNK: 15
} as const

/**
 * Đọc biến môi trường Vite — AI: Google Gemini (API key), tuỳ chọn OpenAI cho vision.
 */
export type ImageToTextProviderId = "gemini" | "openai";

export const GEMINI_OCR_MODELS = [
  // BEST
  "gemini-2.5-flash",
  "gemini-3-flash",
  "gemini-3.1-flash-lite",

  // Lite fallback
  "gemini-2.5-flash-lite",
  "gemini-2-flash",
  "gemini-2-flash-lite",

  // Pro fallback
  "gemini-2.5-pro",
  "gemini-3.1-pro",

  // Preview / image capable
  "gemini-2.5-flash-preview",
  "gemini-3-flash-preview",

  // Experimental fallback
  "gemini-1.5-flash",
  "gemini-1.5-pro",

  // Legacy
  "gemini-pro-vision",
] as const;

// Text grading / reasoning models
// Chuyên chấm điểm, phân tích, JSON output

export const GEMINI_GRADING_MODELS = [
  // BEST
  "gemini-2.5-flash",
  "gemini-3-flash",
  "gemini-3.1-flash-lite",

  // Stable fallback
  "gemini-2.5-flash-lite",
  "gemini-2-flash",
  "gemini-2-flash-lite",

  // Strong reasoning
  "gemini-2.5-pro",
  "gemini-3.1-pro",

  // Older stable
  "gemini-1.5-flash",
  "gemini-1.5-pro",

  // Ultra legacy fallback
  "gemini-pro",
] as const;

/** Model mặc định cho OCR / vision — phần tử đầu của GEMINI_OCR_MODELS. */
export const DEFAULT_GEMINI_VISION_MODEL: string = GEMINI_OCR_MODELS[0];

/** Model mặc định cho chấm điểm — phần tử đầu của GEMINI_GRADING_MODELS. */
export const DEFAULT_GEMINI_GRADING_MODEL: string = GEMINI_GRADING_MODELS[0];

/**
 * Kiểm tra xem lỗi có phải do rate-limit / quota vượt mức không.
 * Hỗ trợ: Google AI (429 RESOURCE_EXHAUSTED), OpenAI (429 rate_limit_exceeded).
 */
export function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  // HTTP 429 hoặc các chuỗi thông điệp phổ biến của Gemini / OpenAI
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate_limit') ||
    msg.includes('quota') ||
    msg.includes('too many requests') ||
    msg.includes('ratelimit')
  );
}

/**
 * Gọi `fn(model)` lần lượt qua danh sách models.
 * Nếu một model bị rate-limit / quota thì tự động thử model tiếp theo — không throw.
 * Nếu tất cả đều thất bại vì rate-limit, throw lỗi của model cuối cùng.
 * Các lỗi khác (không phải rate-limit) được ném ra ngay lập tức.
 */
export async function withModelFallback<T>(
  models: readonly string[],
  fn: (model: string) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (const model of models) {
    try {
      return await fn(model);
    } catch (err) {
      if (isRateLimitError(err)) {
        lastError = err;
        // tiếp tục thử model tiếp theo
        continue;
      }
      // lỗi khác (timeout, schema, network...) — ném ngay
      throw err;
    }
  }
  throw lastError;
}

/** Chuẩn hoá id model (bỏ prefix `google/` nếu copy từ Puter cũ). */
export function normalizeGeminiModelId(
  raw: string | undefined,
  fallback: string,
): string {
  const s = (raw ?? fallback).trim();
  if (s.startsWith("google/")) return s.slice("google/".length);
  return s || fallback;
}

function normalizeImageToTextProvider(
  raw: string | undefined,
): ImageToTextProviderId {
  const v = (raw ?? "gemini").trim().toLowerCase();
  /** Legacy `.env` từng dùng `puter` */
  if (v === "puter" || v === "gemini" || v === "google") return "gemini";
  if (v === "openai") return "openai";
  return "gemini";
}

/** API key Google AI Studio / Gemini API — bắt buộc cho chấm điểm & OCR khi dùng Gemini. */
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

export const GEMINI_GRADING_MODEL = normalizeGeminiModelId(
  import.meta.env.VITE_GEMINI_GRADING_MODEL ||
    import.meta.env.VITE_GEMINI_MODEL,
  DEFAULT_GEMINI_GRADING_MODEL,
);

export const GEMINI_VISION_MODEL = normalizeGeminiModelId(
  import.meta.env.VITE_GEMINI_VISION_MODEL || import.meta.env.VITE_GEMINI_MODEL,
  DEFAULT_GEMINI_VISION_MODEL,
);

export const IMAGE_TO_TEXT_PROVIDER = normalizeImageToTextProvider(
  import.meta.env.VITE_IMAGE_TO_TEXT_PROVIDER,
);

export type SubmissionImageStorageMode = "firebase" | "local" | "gdrive";

export function getSubmissionImageStorageMode(): SubmissionImageStorageMode {
  const v = (import.meta.env.VITE_SUBMISSION_IMAGE_STORAGE ?? "firebase")
    .trim()
    .toLowerCase();
  if (v === "local") return "local";
  if (v === "gdrive" || v === "drive" || v === "google-drive") return "gdrive";
  return "firebase";
}

export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";
export const OPENAI_API_BASE =
  import.meta.env.VITE_OPENAI_API_BASE || "https://api.openai.com/v1";
export const OPENAI_VISION_MODEL =
  import.meta.env.VITE_OPENAI_VISION_MODEL || "gemini-2.5-flash";

export function describeImageToTextBackend(): string {
  switch (IMAGE_TO_TEXT_PROVIDER) {
    case "gemini":
      return `Gemini (${GEMINI_VISION_MODEL} + ${GEMINI_OCR_MODELS.length - 1} fallback)`;
    case "openai":
      return `OpenAI Vision (${OPENAI_VISION_MODEL})`;
    default:
      return String(IMAGE_TO_TEXT_PROVIDER);
  }
}

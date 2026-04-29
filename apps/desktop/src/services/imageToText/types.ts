import type { ImageToTextProviderId } from '../config'

export type ImageToTextResult = {
  text: string
  /**
   * Vision AI: -1 — không có điểm kiểu OCR cục bộ; hiển thị UI khác.
   * Dữ liệu cũ (trước khi gỡ Paddle): có thể còn ~0…1 nếu đã lưu trong submission.
   */
  confidence: number
  provider: ImageToTextProviderId
}

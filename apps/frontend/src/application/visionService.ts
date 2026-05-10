/**
 * Application: ảnh → văn bản.
 * Provider cụ thể do `config/env` + `services/imageToText` chọn (Gemini / OpenAI).
 */
export { runImageToText } from '../services/imageToText'
export type { ImageToTextResult, ImageToTextProviderId } from '../services/imageToText'

import i18n from '../../i18n/i18n'
import { IMAGE_TO_TEXT_PROVIDER, type ImageToTextProviderId } from '../config'

import type { ImageToTextResult } from './types'

export type { ImageToTextProviderId } from '../config'
export type { ImageToTextResult } from './types'
export { VI_TRANSCRIBE_PROMPT } from './prompts'

/**
 * Chuyển ảnh bài làm → văn bản.
 * Provider do `VITE_IMAGE_TO_TEXT_PROVIDER` quyết định — thêm provider trong `providers/` và switch bên dưới.
 */
export async function runImageToText(file: File): Promise<ImageToTextResult> {
  const p = IMAGE_TO_TEXT_PROVIDER as ImageToTextProviderId

  switch (p) {
    case 'puter': {
      const { runPuterVision } = await import('./providers/puterVision')
      return runPuterVision(file)
    }
    case 'openai': {
      const { runOpenAiVision } = await import('./providers/openaiVision')
      return runOpenAiVision(file)
    }
    default:
      throw new Error(i18n.t('errors.imageProvider', { provider: String(p) }))
  }
}

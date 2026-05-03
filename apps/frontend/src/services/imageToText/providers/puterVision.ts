import puter from '@heyputer/puter.js'

import { PUTER_VISION_MODEL } from '../../config'
import { extractTextFromAiChatResponse } from '../extract'
import { VI_TRANSCRIBE_PROMPT } from '../prompts'
import type { ImageToTextResult } from '../types'

export async function runPuterVision(file: File): Promise<ImageToTextResult> {
  const resp = await puter.ai.chat(VI_TRANSCRIBE_PROMPT, file, {
    model: PUTER_VISION_MODEL,
    temperature: 0.15,
    max_tokens: 8192
  })

  const text = extractTextFromAiChatResponse(resp)
  if (!text.trim()) {
    throw new Error('Puter AI không trả về văn bản. Kiểm tra đăng nhập Puter / model / quota.')
  }

  return {
    text: text.trim(),
    confidence: -1,
    provider: 'puter'
  }
}

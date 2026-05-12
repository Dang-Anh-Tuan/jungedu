import { GoogleGenerativeAI } from '@google/generative-ai'
import i18n from 'i18next'

import {
  GEMINI_API_KEY,
  GEMINI_VISION_MODEL,
  GEMINI_OCR_MODELS,
  withModelFallback,
} from '../../../config/env'
import { fileToGeminiInlineData } from '../geminiInlineData'
import { VI_TRANSCRIBE_PROMPT } from '../prompts'
import type { ImageToTextResult } from '../types'

export async function runGeminiVision(file: File): Promise<ImageToTextResult> {
  const key = GEMINI_API_KEY.trim()
  if (!key) {
    throw new Error(i18n.t('errors.geminiMissingKey'))
  }

  const { data, mimeType } = await fileToGeminiInlineData(file)

  async function runWithModel(activeModel: string) {
    const genAI = new GoogleGenerativeAI(key)
    const model = genAI.getGenerativeModel({
      model: activeModel,
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 8192,
      },
    })

    const result = await model.generateContent([
      {
        inlineData: { mimeType, data },
      },
      { text: VI_TRANSCRIBE_PROMPT },
    ])

    const text = result.response.text()?.trim() ?? ''
    if (!text) {
      throw new Error(i18n.t('errors.geminiVisionEmpty'))
    }

    const textLower = text.toLowerCase()
    if (
      textLower.includes('429') ||
      textLower.includes('resource_exhausted') ||
      textLower.includes('rate_limit') ||
      textLower.includes('quota') ||
      textLower.includes('too many requests') ||
      textLower.includes('ratelimit')
    ) {
      throw new Error(text)
    }

    return {
      text,
      confidence: -1,
      provider: 'gemini',
    }
  }

  const models = GEMINI_OCR_MODELS && GEMINI_OCR_MODELS.length > 0 ? GEMINI_OCR_MODELS : [GEMINI_VISION_MODEL]
  return withModelFallback(models, runWithModel)
}

import { GoogleGenerativeAI } from '@google/generative-ai'
import i18n from 'i18next'

import { GEMINI_API_KEY, GEMINI_VISION_MODEL } from '../../../config/env'
import { VI_TRANSCRIBE_PROMPT } from '../prompts'
import type { ImageToTextResult } from '../types'

async function fileToBase64Parts(file: File): Promise<{ data: string; mimeType: string }> {
  const mimeType = file.type || 'image/jpeg'
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  const data = btoa(binary)
  return { data, mimeType }
}

export async function runGeminiVision(file: File): Promise<ImageToTextResult> {
  const key = GEMINI_API_KEY.trim()
  if (!key) {
    throw new Error(i18n.t('errors.geminiMissingKey'))
  }

  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({
    model: GEMINI_VISION_MODEL,
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 8192
    }
  })

  const { data, mimeType } = await fileToBase64Parts(file)

  const result = await model.generateContent([
    {
      inlineData: { mimeType, data }
    },
    { text: VI_TRANSCRIBE_PROMPT }
  ])

  const text = result.response.text()?.trim() ?? ''
  if (!text) {
    throw new Error(i18n.t('errors.geminiVisionEmpty'))
  }

  return {
    text,
    confidence: -1,
    provider: 'gemini'
  }
}

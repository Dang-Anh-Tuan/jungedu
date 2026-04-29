import puter from '@heyputer/puter.js'
import { z } from 'zod'

import { extractTextFromAiChatResponse } from '../imageToText/extract'

import { extractFirstJsonObject } from './extractJson'

/**
 * Gọi Puter AI chat với nội dung JSON mong đợi; validate bằng Zod.
 * Tương đương `callOpenAiAndValidate` phía server (OpenAI SDK).
 */
export async function callPuterJson<T>({
  messages,
  schema,
  model,
  temperature = 0
}: {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  schema: z.ZodType<T>
  model: string
  temperature?: number
}): Promise<T> {
  const withJsonHint: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    ...messages,
    {
      role: 'user',
      content:
        'Return ONLY valid JSON that matches the expected schema. Do not wrap in markdown code fences unless necessary; output must be parseable JSON.'
    }
  ]

  const resp = await puter.ai.chat(withJsonHint as never, {
    model,
    temperature,
    max_tokens: 8192
  })

  const raw = extractTextFromAiChatResponse(resp)
  if (!raw?.trim()) {
    throw new Error('Puter AI không trả về nội dung (JSON). Kiểm tra model / quota.')
  }
  const jsonText = extractFirstJsonObject(raw)
  const parsed = JSON.parse(jsonText)
  return schema.parse(parsed)
}

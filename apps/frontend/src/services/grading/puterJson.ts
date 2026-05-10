import puter from '@heyputer/puter.js'
import i18n from 'i18next'
import { z } from 'zod'

import { LIMITS, TIMING } from '../../config/constants'
import { JSON_ONLY_FOLLOWUP } from '../../prompts/gradingPrompts'
import { extractTextFromAiChatResponse } from '../imageToText/extract'

import { extractFirstJsonObject } from './extractJson'

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const sec = ms / 1000
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(i18n.t('errors.aiTimeout', { label, seconds: sec })))
    }, ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}

/**
 * Gọi Puter AI chat với nội dung JSON mong đợi; validate bằng Zod.
 * Đổi vendor: thay implementation bằng OpenAI SDK / fetch backend.
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
      content: JSON_ONLY_FOLLOWUP
    }
  ]

  const resp = await withTimeout(
    puter.ai.chat(withJsonHint as never, {
      model,
      temperature,
      max_tokens: LIMITS.GRADING_MAX_TOKENS
    }),
    TIMING.AI_CHAT_TIMEOUT_MS,
    `Puter AI (${model})`
  )

  const raw = extractTextFromAiChatResponse(resp)
  if (!raw?.trim()) {
    throw new Error(i18n.t('errors.puterEmptyResponse'))
  }
  const jsonText = extractFirstJsonObject(raw)
  const parsed = JSON.parse(jsonText)
  return schema.parse(parsed)
}

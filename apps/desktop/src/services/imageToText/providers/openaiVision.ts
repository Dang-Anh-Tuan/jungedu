import { OPENAI_API_BASE, OPENAI_API_KEY, OPENAI_VISION_MODEL } from '../../config'
import { VI_TRANSCRIBE_PROMPT } from '../prompts'
import type { ImageToTextResult } from '../types'
import { fileToDataUrl } from '../../../lib/fileDataUrl'

export async function runOpenAiVision(file: File): Promise<ImageToTextResult> {
  if (!OPENAI_API_KEY.trim()) {
    throw new Error('Thiếu VITE_OPENAI_API_KEY — hoặc chọn provider Puter.')
  }

  const dataUrl = await fileToDataUrl(file)

  const res = await fetch(`${OPENAI_API_BASE.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_VISION_MODEL,
      temperature: 0.15,
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: VI_TRANSCRIBE_PROMPT },
            {
              type: 'image_url',
              image_url: { url: dataUrl }
            }
          ]
        }
      ]
    })
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`OpenAI Vision (${res.status}): ${errBody.slice(0, 400)}`)
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | unknown[] } }>
  }
  const raw = json.choices?.[0]?.message?.content
  let text = ''
  if (typeof raw === 'string') text = raw
  else if (Array.isArray(raw)) {
    text = raw
      .map((p: unknown) =>
        typeof p === 'object' && p !== null && 'text' in (p as object)
          ? String((p as { text?: string }).text ?? '')
          : ''
      )
      .join('')
  }

  text = text.trim()
  if (!text) throw new Error('OpenAI không trả về văn bản.')

  return {
    text,
    confidence: -1,
    provider: 'openai'
  }
}

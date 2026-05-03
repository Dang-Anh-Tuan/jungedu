/** Chuẩn hoá phản hồi lỏng kiểu từ Puter / SDK AI. */
export function extractTextFromAiChatResponse(resp: unknown): string {
  if (resp == null) return ''
  if (typeof resp === 'string') return resp.trim()

  const r = resp as Record<string, unknown>

  const choices = r.choices as unknown[] | undefined
  if (choices?.[0] && typeof choices[0] === 'object') {
    const ch0 = choices[0] as Record<string, unknown>
    const msg = ch0.message as Record<string, unknown> | undefined
    const content = msg?.content
    const fromContent = stringifyContent(content)
    if (fromContent) return fromContent.trim()
  }

  const message = r.message as Record<string, unknown> | undefined
  if (message?.content !== undefined) {
    const s = stringifyContent(message.content)
    if (s) return s.trim()
  }

  if (typeof r.content === 'string') return r.content.trim()
  if (typeof r.text === 'string') return r.text.trim()

  return ''
}

function stringifyContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((block) => {
      if (typeof block === 'string') return block
      if (block && typeof block === 'object') {
        const b = block as Record<string, unknown>
        if (typeof b.text === 'string') return b.text
      }
      return ''
    })
    .join('')
}

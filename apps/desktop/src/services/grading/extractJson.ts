/** Lấy object JSON đầu tiên khỏi chuỗi (kể cả khi bọc trong markdown). */
export function extractFirstJsonObject(text: string): string {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '')
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Model không trả về JSON object hợp lệ.')
  }
  return cleaned.slice(firstBrace, lastBrace + 1)
}

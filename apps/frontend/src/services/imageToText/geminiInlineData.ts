/** Chuẩn bị ảnh cho Gemini `inlineData` (dùng chung vision đơn & batch). */
export async function fileToGeminiInlineData(file: File): Promise<{ data: string; mimeType: string }> {
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

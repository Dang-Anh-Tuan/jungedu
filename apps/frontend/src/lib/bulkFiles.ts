/** Sắp xếp tên file theo tiếng Việt + số (page2 trước page10). */
export function sortFilesNatural(files: File[]) {
  return [...files].sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' }))
}

/**
 * Gom ảnh theo phần đầu tên file trước ký tự `_` hoặc khoảng trắng.
 * Ví dụ: HS01_1.jpg, HS01_2.jpg → nhóm "HS01".
 */
export function groupFilesByLeadingToken(files: File[]) {
  const map = new Map<string, File[]>()
  for (const f of sortFilesNatural(files)) {
    const base = f.name.replace(/\.[^/.]+$/, '')
    const token = base.split(/[_\s]+/)[0]?.trim() ?? ''
    const key = token || base
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(f)
  }
  return map
}

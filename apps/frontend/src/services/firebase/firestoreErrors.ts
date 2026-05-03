/** Đưa lỗi Firebase về thông báo dễ hiểu (đặc biệt Rules / mạng). */
export function rewriteFirestoreError(err: unknown): Error {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code?: string }).code)
    const map: Record<string, string> = {
      'permission-denied':
        'Firebase đã từ chối ghi/đọc. Kiểm tra Firestore Rules (Console → Firestore → Rules) và đảm bảo cho phép read/write đúng collection.',
      unavailable: 'Không kết nối được Firestore. Kiểm tra mạng và thử lại.',
      'failed-precondition': 'Thao tác Firestore không thỏa điều kiện (failed-precondition).',
      unauthenticated: 'Chưa đăng nhập Firebase (nếu Rules yêu cầu auth).'
    }
    const msg = map[code]
    if (msg) return new Error(msg)
  }
  if (err instanceof Error) return err
  return new Error(String(err))
}

import { auth } from '../../lib/firebase'

export type UserScopedCollection = 'classes' | 'students' | 'exams' | 'submissions' | 'settings'

export function getRequiredAuthUid(): string {
  const uid = auth.currentUser?.uid?.trim()
  if (!uid) {
    throw new Error('Bạn chưa đăng nhập Google. Vui lòng đăng nhập lại.')
  }
  return uid
}

export function getUserCollectionPath(uid: string, collectionName: UserScopedCollection): string {
  return `users/${uid}/${collectionName}`
}

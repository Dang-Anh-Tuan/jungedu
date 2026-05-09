import { collection, onSnapshot } from 'firebase/firestore'
import type { QueryDocumentSnapshot, QuerySnapshot } from 'firebase/firestore'
import type { FirebaseError } from 'firebase/app'
import { db } from '../../lib/firebase'
import type { Exam, SchoolClass, Student, Submission } from '../../types'
import {
  normalizeExam,
  normalizeSchoolClass,
  normalizeStudent,
  normalizeSubmission
} from './firestoreCodec'
import { getUserCollectionPath } from './firestorePaths'
import { rewriteFirestoreError } from './firestoreErrors'

export type FirestoreSyncDispatch = {
  setClasses: (classes: SchoolClass[]) => void
  setStudents: (students: Student[]) => void
  setExams: (exams: Exam[]) => void
  setSubmissions: (submissions: Submission[]) => void
  /** Gọi một lần sau khi mỗi collection nhận snapshot đầu tiên (để tắt loading). */
  onInitialHydrationTick: () => void
  /** Lỗi listener (thường do Rules / mạng). */
  onSnapshotError?: (path: string, message: string) => void
}

function subscribeCollection<T>(
  path: string,
  mapDocs: (snap: QuerySnapshot) => T,
  apply: (data: T) => void,
  onInitial: () => void,
  onListenerFailed: (path: string, err: FirebaseError) => void
): () => void {
  let first = true
  return onSnapshot(
    collection(db, path),
    (snap) => {
      apply(mapDocs(snap))
      if (first) {
        first = false
        onInitial()
      }
    },
    (error) => {
      console.error(`[Firestore] subscribe ${path}:`, error)
      onListenerFailed(path, error)
    }
  )
}

/**
 * Lắng nghe realtime Firestore. Trả về hàm unsubscribe (ví dụ khi logout).
 * Migrate BE: thay module này bằng WebSocket hoặc polling gọi REST.
 */
export function subscribeFirestoreCollections(uid: string, dispatch: FirestoreSyncDispatch): () => void {
  let pending = 4
  const initialReceived = () => {
    pending -= 1
    if (pending <= 0) dispatch.onInitialHydrationTick()
  }

  const listenerFailed = (path: string, err: FirebaseError) => {
    if (pending > 0) {
      pending -= 1
      if (pending <= 0) dispatch.onInitialHydrationTick()
    }
    const msg = rewriteFirestoreError(err).message
    dispatch.onSnapshotError?.(path, msg)
  }

  const unsubs = [
    subscribeCollection(
      getUserCollectionPath(uid, 'classes'),
      (snap) =>
        snap.docs.map((d: QueryDocumentSnapshot) => normalizeSchoolClass(d.id, d.data() as Record<string, unknown>)),
      dispatch.setClasses,
      initialReceived,
      listenerFailed
    ),
    subscribeCollection(
      getUserCollectionPath(uid, 'students'),
      (snap) =>
        snap.docs.map((d: QueryDocumentSnapshot) => normalizeStudent(d.id, d.data() as Record<string, unknown>)),
      dispatch.setStudents,
      initialReceived,
      listenerFailed
    ),
    subscribeCollection(
      getUserCollectionPath(uid, 'exams'),
      (snap) =>
        snap.docs.map((d: QueryDocumentSnapshot) => normalizeExam(d.id, d.data() as Record<string, unknown>)),
      dispatch.setExams,
      initialReceived,
      listenerFailed
    ),
    subscribeCollection(
      getUserCollectionPath(uid, 'submissions'),
      (snap) =>
        snap.docs.map((d: QueryDocumentSnapshot) =>
          normalizeSubmission(d.id, d.data() as Record<string, unknown>)
        ),
      dispatch.setSubmissions,
      initialReceived,
      listenerFailed
    )
  ]

  return () => unsubs.forEach((u) => u())
}

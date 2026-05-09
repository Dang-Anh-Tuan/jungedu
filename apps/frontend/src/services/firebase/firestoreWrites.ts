import { doc, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Exam, SchoolClass, Student, Submission } from '../../types'
import {
  deepStripUndefined,
  serializeExam,
  serializeSchoolClass,
  serializeStudent,
  serializeSubmission
} from './firestoreCodec'
import { getRequiredAuthUid } from './firestorePaths'
import { rewriteFirestoreError } from './firestoreErrors'

export async function setSchoolClassDoc(cls: SchoolClass): Promise<void> {
  const uid = getRequiredAuthUid()
  try {
    await setDoc(doc(db, 'users', uid, 'classes', cls.id), serializeSchoolClass(cls))
  } catch (e) {
    throw rewriteFirestoreError(e)
  }
}

export type DeleteClassCascadeParams = {
  classId: string
  studentIds: string[]
  exams: { examId: string; submissionIds: string[] }[]
}

/** Xóa lớp và học sinh / bài kiểm tra / submission liên quan (một batch). */
export async function deleteClassCascadeDocs(params: DeleteClassCascadeParams): Promise<void> {
  const uid = getRequiredAuthUid()
  const batch = writeBatch(db)
  batch.delete(doc(db, 'users', uid, 'classes', params.classId))
  for (const sid of params.studentIds) {
    batch.delete(doc(db, 'users', uid, 'students', sid))
  }
  for (const e of params.exams) {
    batch.delete(doc(db, 'users', uid, 'exams', e.examId))
    for (const subId of e.submissionIds) {
      batch.delete(doc(db, 'users', uid, 'submissions', subId))
    }
  }
  try {
    await batch.commit()
  } catch (e) {
    throw rewriteFirestoreError(e)
  }
}

export type ReplaceStudentsForClassParams = {
  studentIdsToRemove: string[]
  studentsToUpsert: Student[]
}

export async function batchReplaceStudentsForClassDocs(params: ReplaceStudentsForClassParams): Promise<void> {
  const uid = getRequiredAuthUid()
  const { studentIdsToRemove, studentsToUpsert } = params
  if (studentIdsToRemove.length === 0 && studentsToUpsert.length === 0) {
    return
  }
  const batch = writeBatch(db)
  for (const id of studentIdsToRemove) {
    batch.delete(doc(db, 'users', uid, 'students', id))
  }
  for (const student of studentsToUpsert) {
    batch.set(doc(db, 'users', uid, 'students', student.id), serializeStudent(student))
  }
  try {
    await batch.commit()
  } catch (e) {
    throw rewriteFirestoreError(e)
  }
}

export async function setExamDoc(exam: Exam): Promise<void> {
  const uid = getRequiredAuthUid()
  try {
    await setDoc(doc(db, 'users', uid, 'exams', exam.id), serializeExam(exam))
  } catch (e) {
    throw rewriteFirestoreError(e)
  }
}

export async function mergeExamDocPatch(examId: string, patch: Record<string, unknown>): Promise<void> {
  const uid = getRequiredAuthUid()
  try {
    await setDoc(doc(db, 'users', uid, 'exams', examId), deepStripUndefined(patch), { merge: true })
  } catch (e) {
    throw rewriteFirestoreError(e)
  }
}

export async function deleteExamAndSubmissionsDocs(examId: string, submissionIds: string[]): Promise<void> {
  const uid = getRequiredAuthUid()
  const batch = writeBatch(db)
  batch.delete(doc(db, 'users', uid, 'exams', examId))
  for (const sid of submissionIds) {
    batch.delete(doc(db, 'users', uid, 'submissions', sid))
  }
  try {
    await batch.commit()
  } catch (e) {
    throw rewriteFirestoreError(e)
  }
}

export async function setSubmissionDoc(submission: Submission): Promise<void> {
  const uid = getRequiredAuthUid()
  try {
    await setDoc(doc(db, 'users', uid, 'submissions', submission.id), serializeSubmission(submission))
  } catch (e) {
    throw rewriteFirestoreError(e)
  }
}

export async function mergeSubmissionDoc(submissionId: string, patch: Record<string, unknown>): Promise<void> {
  const uid = getRequiredAuthUid()
  try {
    await setDoc(doc(db, 'users', uid, 'submissions', submissionId), deepStripUndefined(patch), { merge: true })
  } catch (e) {
    throw rewriteFirestoreError(e)
  }
}

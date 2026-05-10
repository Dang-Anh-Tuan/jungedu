import type { DocumentReference } from 'firebase/firestore'
import { googleDriveThumbnailUrl } from '../googleDrive/thumbnailUrl'
import {
  normalizeExamRubricFromFirestore,
  normalizeGradingRubricScoresFromFirestore
} from '../../lib/rubric'
import type {
  Exam,
  GradingMistake,
  GradingResult,
  OcrPageResult,
  SchoolClass,
  Student,
  Submission,
  SubmissionImageFile
} from '../../types'

/** Giữ giá trị Firestore hợp lệ; bỏ undefined để tránh lỗi ghi. */
export function deepStripUndefined<T>(value: T): T {
  if (value === undefined) return value
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.map((item) => deepStripUndefined(item)) as unknown as T
  }
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(value as object)) {
    const v = (value as Record<string, unknown>)[key]
    if (v !== undefined) out[key] = deepStripUndefined(v)
  }
  return out as T
}

function isFirestoreDocRef(value: unknown): value is DocumentReference {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    typeof (value as DocumentReference).path === 'string' &&
    'id' in value &&
    typeof (value as DocumentReference).id === 'string'
  )
}

/** Chuẩn hoá classId từ string, DocumentReference, hoặc dữ liệu legacy sai kiểu (map rỗng…). */
export function coerceClassId(raw: unknown): string {
  if (typeof raw === 'string') {
    const t = raw.trim()
    return t
  }
  if (isFirestoreDocRef(raw)) {
    return raw.path.split('/').at(-1) ?? ''
  }
  return ''
}

function stringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string')
}

export function normalizeSchoolClass(docId: string, raw: Record<string, unknown>): SchoolClass {
  const id = typeof raw.id === 'string' ? raw.id : docId
  const name = typeof raw.name === 'string' ? raw.name : ''
  const gradeVal = raw.grade
  const grade = typeof gradeVal === 'number' && Number.isFinite(gradeVal) ? gradeVal : undefined
  return { id, name, grade }
}

export function normalizeStudent(docId: string, raw: Record<string, unknown>): Student {
  const id = typeof raw.id === 'string' ? raw.id : docId
  const classId = coerceClassId(raw.classId)
  return {
    id,
    classId,
    studentCode: typeof raw.studentCode === 'string' ? raw.studentCode : undefined,
    name: typeof raw.name === 'string' ? raw.name : '',
    hocLuc: typeof raw.hocLuc === 'string' ? raw.hocLuc : undefined,
    tags: stringArray(raw.tags),
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    customRules: stringArray(raw.customRules)
  }
}

/** Payload ghi xuống Firestore — luôn dùng primitive/array hợp lệ. */
export function serializeStudent(s: Student): Record<string, unknown> {
  const classId = typeof s.classId === 'string' ? s.classId.trim() : ''
  if (!classId) {
    console.warn('[Firestore] Student thiếu classId hợp lệ khi ghi:', s.id)
  }
  return deepStripUndefined({
    id: s.id,
    classId,
    name: s.name,
    notes: s.notes ?? '',
    tags: Array.isArray(s.tags) ? s.tags : [],
    customRules: Array.isArray(s.customRules) ? s.customRules : [],
    studentCode: s.studentCode,
    hocLuc: s.hocLuc
  }) as Record<string, unknown>
}

export function serializeSchoolClass(c: SchoolClass): Record<string, unknown> {
  return deepStripUndefined({
    id: c.id,
    name: c.name,
    grade: c.grade
  }) as Record<string, unknown>
}

export function normalizeExam(docId: string, raw: Record<string, unknown>): Exam {
  const rubric = normalizeExamRubricFromFirestore(raw.rubric)
  const style = raw.teacherStyle
  const teacherStyle: Exam['teacherStyle'] =
    style === 'neutral' || style === 'strict' || style === 'encouraging' ? style : 'encouraging'

  return {
    id: typeof raw.id === 'string' ? raw.id : docId,
    classId: coerceClassId(raw.classId),
    title: typeof raw.title === 'string' ? raw.title : '',
    subject: typeof raw.subject === 'string' ? raw.subject : '',
    grade: typeof raw.grade === 'number' && Number.isFinite(raw.grade) ? raw.grade : 0,
    requirements: typeof raw.requirements === 'string' ? raw.requirements : '',
    rubric,
    teacherStyle
  }
}

export function serializeExam(e: Exam): Record<string, unknown> {
  return deepStripUndefined({ ...e }) as Record<string, unknown>
}

function normalizeOcrPage(raw: Record<string, unknown>): OcrPageResult | null {
  const id = typeof raw.id === 'string' ? raw.id : ''
  if (!id) return null
  const confidence =
    typeof raw.confidence === 'number' && Number.isFinite(raw.confidence) ? raw.confidence : -1
  return {
    id,
    imageName: typeof raw.imageName === 'string' ? raw.imageName : '',
    ocrText: typeof raw.ocrText === 'string' ? raw.ocrText : '',
    confidence,
    correctedText: typeof raw.correctedText === 'string' ? raw.correctedText : ''
  }
}

function coerceMistakeType(raw: unknown): GradingMistake['type'] {
  const allowed: GradingMistake['type'][] = [
    'spelling',
    'repeat',
    'grammar',
    'missing_idea',
    'structure',
    'suggestion',
    'other'
  ]
  if (typeof raw === 'string' && allowed.includes(raw as GradingMistake['type'])) {
    return raw as GradingMistake['type']
  }
  return 'other'
}

function normalizeGradingResult(raw: Record<string, unknown> | null | undefined): GradingResult | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const rubricRaw = raw.rubric as Record<string, unknown> | undefined
  const mistakesRaw = raw.mistakes
  const mistakes = Array.isArray(mistakesRaw)
    ? mistakesRaw
        .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
        .map((m) => ({
          type: coerceMistakeType(m.type),
          original: typeof m.original === 'string' ? m.original : '',
          suggestion: typeof m.suggestion === 'string' ? m.suggestion : undefined,
          explanation: typeof m.explanation === 'string' ? m.explanation : undefined
        }))
    : []
  return {
    score: typeof raw.score === 'number' && Number.isFinite(raw.score) ? raw.score : 0,
    rubric: normalizeGradingRubricScoresFromFirestore(rubricRaw),
    strengths: stringArray(raw.strengths),
    mistakes,
    rewriteSuggestion: typeof raw.rewriteSuggestion === 'string' ? raw.rewriteSuggestion : '',
    teacherComment: typeof raw.teacherComment === 'string' ? raw.teacherComment : ''
  }
}

/** Chỉ ghi metadata ảnh lên Firestore — không gửi base64/blob URL. */
export function stripImageFilesForFirestore(files: SubmissionImageFile[]): Record<string, unknown>[] {
  return files.map((img) => {
    if (img.storageKind === 'gdrive' && img.driveFileId) {
      return {
        id: img.id,
        name: img.name,
        storageKind: 'gdrive',
        driveFileId: img.driveFileId,
        dataUrl: '',
        objectUrl: ''
      }
    }
    if (img.storageKind === 'local' && img.localKey) {
      return {
        id: img.id,
        name: img.name,
        storageKind: 'local',
        localKey: img.localKey,
        dataUrl: '',
        objectUrl: ''
      }
    }
    const du = img.dataUrl
    const ou = img.objectUrl
    const dataUrl = du.startsWith('https://') || du.startsWith('http://') ? du : ''
    const objectUrl = ou.startsWith('https://') || ou.startsWith('http://') ? ou : ''
    return {
      id: img.id,
      name: img.name,
      storageKind: 'firebase',
      dataUrl,
      objectUrl
    }
  })
}

export function normalizeSubmission(docId: string, raw: Record<string, unknown>): Submission {
  const imgs = raw.imageFiles
  const imageFiles: SubmissionImageFile[] = Array.isArray(imgs)
    ? imgs
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((img) => {
          const localKey = typeof img.localKey === 'string' ? img.localKey.trim() : ''
          const driveFileId = typeof img.driveFileId === 'string' ? img.driveFileId.trim() : ''
          const skRaw = typeof img.storageKind === 'string' ? img.storageKind : undefined
          const isGdrive = skRaw === 'gdrive' || driveFileId.length > 0
          if (isGdrive && driveFileId) {
            const vu = googleDriveThumbnailUrl(driveFileId)
            return {
              id: typeof img.id === 'string' ? img.id : '',
              name: typeof img.name === 'string' ? img.name : '',
              objectUrl: vu,
              dataUrl: vu,
              storageKind: 'gdrive' as const,
              driveFileId,
              localKey: undefined
            } satisfies SubmissionImageFile
          }
          const isLocal = skRaw === 'local' || (localKey.length > 0 && skRaw !== 'firebase')
          return {
            id: typeof img.id === 'string' ? img.id : '',
            name: typeof img.name === 'string' ? img.name : '',
            objectUrl: typeof img.objectUrl === 'string' ? img.objectUrl : '',
            dataUrl: typeof img.dataUrl === 'string' ? img.dataUrl : '',
            storageKind: isLocal ? 'local' : 'firebase',
            localKey: isLocal ? localKey : undefined
          } satisfies SubmissionImageFile
        })
        .filter((img) => {
          if (!img.id) return false
          if (img.storageKind === 'local') return !!img.localKey
          if (img.storageKind === 'gdrive') return !!img.driveFileId
          return !!(img.dataUrl || img.objectUrl)
        })
    : []

  const pagesRaw = raw.ocrPages
  const ocrPages: OcrPageResult[] = Array.isArray(pagesRaw)
    ? pagesRaw
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((p) => normalizeOcrPage(p))
        .filter((p): p is OcrPageResult => p !== null)
    : []

  let gradingResult: GradingResult | undefined
  if (raw.gradingResult === null || raw.gradingResult === undefined) {
    gradingResult = undefined
  } else if (typeof raw.gradingResult === 'object') {
    gradingResult = normalizeGradingResult(raw.gradingResult as Record<string, unknown>)
  }

  const visionConvertedAt =
    typeof raw.visionConvertedAt === 'string' ? raw.visionConvertedAt : undefined
  const gradedAt = typeof raw.gradedAt === 'string' ? raw.gradedAt : undefined
  const teacherRevisedAt = typeof raw.teacherRevisedAt === 'string' ? raw.teacherRevisedAt : undefined

  return {
    id: typeof raw.id === 'string' ? raw.id : docId,
    examId: typeof raw.examId === 'string' ? raw.examId : '',
    studentId: typeof raw.studentId === 'string' ? raw.studentId : '',
    studentName: typeof raw.studentName === 'string' ? raw.studentName : '',
    imageFiles,
    ocrPages,
    gradingResult,
    visionConvertedAt,
    gradedAt,
    teacherRevisedAt
  }
}

export function serializeSubmission(s: Submission): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: s.id,
    examId: s.examId,
    studentId: s.studentId,
    studentName: s.studentName,
    imageFiles: stripImageFilesForFirestore(s.imageFiles),
    ocrPages: s.ocrPages,
    gradingResult: s.gradingResult === undefined ? null : s.gradingResult
  }
  if (s.visionConvertedAt !== undefined) base.visionConvertedAt = s.visionConvertedAt
  if (s.gradedAt !== undefined) base.gradedAt = s.gradedAt
  if (s.teacherRevisedAt !== undefined) base.teacherRevisedAt = s.teacherRevisedAt
  return deepStripUndefined(base) as Record<string, unknown>
}

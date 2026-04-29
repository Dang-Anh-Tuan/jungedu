import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Exam, GradingResult, SchoolClass, Submission, Student } from '../types'

const LEGACY_DEFAULT_CLASS_ID = 'class_default'

type AppState = {
  teacherName: string
  classes: SchoolClass[]
  students: Student[]
  exams: Exam[]
  submissions: Submission[]
  selectedExamId?: string
  selectedSubmissionId?: string

  createClass: (input: Omit<SchoolClass, 'id'>) => string
  deleteClass: (classId: string) => void
  importStudentsForClass: (
    classId: string,
    rows: { name: string; studentCode?: string; hocLuc?: string; notes?: string }[]
  ) => void

  createExam: (input: Omit<Exam, 'id'>) => string
  updateExam: (examId: string, patch: Partial<Omit<Exam, 'id'>>) => void
  deleteExam: (examId: string) => void
  cloneExam: (examId: string) => string

  createSubmission: (input: { examId: string; studentId: string }) => string
  setSubmissionImages: (
    submissionId: string,
    files: { id: string; name: string; objectUrl: string; dataUrl: string }[]
  ) => void
  replaceSubmissionOcrPages: (
    submissionId: string,
    pages: { imageName: string; ocrText: string; confidence: number; correctedText: string }[]
  ) => void
  setOcrPageCorrectedText: (submissionId: string, pageId: string, correctedText: string) => void
  setGradingResult: (submissionId: string, result: GradingResult) => void
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

function migrateToV2(st: Record<string, unknown>): Record<string, unknown> {
  const classes =
    Array.isArray(st.classes) && (st.classes as SchoolClass[]).length > 0
      ? (st.classes as SchoolClass[])
      : [{ id: LEGACY_DEFAULT_CLASS_ID, name: 'Lớp mặc định' }]

  const studentsRaw = Array.isArray(st.students) ? (st.students as Partial<Student>[]) : []
  const examsRaw = Array.isArray(st.exams) ? (st.exams as Partial<Exam>[]) : []

  const students: Student[] = studentsRaw.map((s) => ({
    id: String(s.id ?? uid('student')),
    classId: String(s.classId ?? LEGACY_DEFAULT_CLASS_ID),
    studentCode: s.studentCode ? String(s.studentCode) : undefined,
    hocLuc: s.hocLuc ? String(s.hocLuc) : undefined,
    name: String(s.name ?? '').trim() || 'Học sinh',
    tags: s.tags ?? [],
    notes: s.notes ?? '',
    customRules: s.customRules ?? []
  }))

  const exams: Exam[] = examsRaw.map((e) => ({
    id: String(e.id ?? uid('exam')),
    classId: String(e.classId ?? LEGACY_DEFAULT_CLASS_ID),
    title: String(e.title ?? ''),
    subject: String(e.subject ?? ''),
    grade: Number(e.grade ?? 0),
    requirements: String(e.requirements ?? ''),
    rubric: e.rubric ?? { content: 4, grammar: 2, creativity: 2, presentation: 2 },
    teacherStyle: (e.teacherStyle as Exam['teacherStyle']) ?? 'encouraging'
  }))

  return {
    ...st,
    teacherName: typeof st.teacherName === 'string' ? st.teacherName : 'Thầy/Cô',
    classes,
    students,
    exams,
    submissions: Array.isArray(st.submissions) ? st.submissions : []
  }
}

/** Không còn «Lớp mặc định»: gỡ id ảo, gán dữ liệu cũ sang một lớp thật nếu cần */
/** Tên ngắn gọn cho dữ liệu migrate từ lớp ảo (không dùng câu dài như «đã nhập trước đây») */
const MIGRATION_CLASS_FALLBACK_NAME = 'Lớp'

function migrateRemoveDefaultClass(st: Record<string, unknown>): Record<string, unknown> {
  let classes = Array.isArray(st.classes) ? ([...(st.classes as SchoolClass[])] as SchoolClass[]) : []
  classes = classes.filter((c) => c.id !== LEGACY_DEFAULT_CLASS_ID)

  let students = Array.isArray(st.students) ? ([...(st.students as Student[])] as Student[]) : []
  let exams = Array.isArray(st.exams) ? ([...(st.exams as Exam[])] as Exam[]) : []

  const hasOrphans =
    students.some((s) => s.classId === LEGACY_DEFAULT_CLASS_ID) ||
    exams.some((e) => e.classId === LEGACY_DEFAULT_CLASS_ID)

  if (hasOrphans) {
    const nid = uid('class')
    classes.push({ id: nid, name: MIGRATION_CLASS_FALLBACK_NAME })
    students = students.map((s) =>
      s.classId === LEGACY_DEFAULT_CLASS_ID ? { ...s, classId: nid } : s
    )
    exams = exams.map((e) =>
      e.classId === LEGACY_DEFAULT_CLASS_ID ? { ...e, classId: nid } : e
    )
  }

  return { ...st, classes, students, exams }
}

/** Đổi tên lớp migrate cũ sang tên ngắn */
function migrateV4RenameLegacyClassTitles(st: Record<string, unknown>): Record<string, unknown> {
  const bad = 'Lớp (đã nhập trước đây)'
  if (!Array.isArray(st.classes)) return st
  const classes = (st.classes as SchoolClass[]).map((c) =>
    c.name === bad ? { ...c, name: MIGRATION_CLASS_FALLBACK_NAME } : c
  )
  return { ...st, classes }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      teacherName: 'Thầy/Cô',
      classes: [],
      students: [],
      exams: [],
      submissions: [],

      createClass: (input) => {
        const id = uid('class')
        const cls: SchoolClass = { id, ...input }
        set((s) => ({ classes: [...s.classes, cls] }))
        return id
      },

      deleteClass: (classId) => {
        set((s) => {
          const removedExamIds = new Set(s.exams.filter((e) => e.classId === classId).map((e) => e.id))
          return {
            classes: s.classes.filter((c) => c.id !== classId),
            students: s.students.filter((st) => st.classId !== classId),
            exams: s.exams.filter((e) => e.classId !== classId),
            submissions: s.submissions.filter((sub) => !removedExamIds.has(sub.examId))
          }
        })
      },

      importStudentsForClass: (classId, rows) => {
        const cleaned = rows
          .map((r) => ({
            name: r.name.trim(),
            studentCode: r.studentCode?.trim() || undefined,
            hocLuc: r.hocLuc?.trim() || undefined,
            notes: r.notes?.trim() || undefined
          }))
          .filter((r) => r.name.length > 0)

        set((s) => {
          const keep = s.students.filter((st) => st.classId !== classId)
          const next: Student[] = [...keep]
          for (const r of cleaned) {
            next.push({
              id: uid('student'),
              classId,
              name: r.name,
              studentCode: r.studentCode,
              hocLuc: r.hocLuc,
              tags: [],
              notes: r.notes ?? '',
              customRules: []
            })
          }
          return { students: next }
        })
      },

      createExam: (input) => {
        const id = uid('exam')
        const exam: Exam = { id, ...input }
        set((s) => ({ exams: [...s.exams, exam], selectedExamId: id }))
        return id
      },

      updateExam: (examId, patch) => {
        set((s) => ({
          exams: s.exams.map((e) => (e.id === examId ? { ...e, ...patch } : e))
        }))
      },

      deleteExam: (examId) => {
        set((s) => ({
          exams: s.exams.filter((e) => e.id !== examId),
          submissions: s.submissions.filter((sub) => sub.examId !== examId),
          selectedExamId: s.selectedExamId === examId ? undefined : s.selectedExamId
        }))
      },

      cloneExam: (examId) => {
        const ex = get().exams.find((e) => e.id === examId)
        if (!ex) throw new Error('Không tìm thấy bài kiểm tra')
        const id = uid('exam')
        const titleBase = ex.title.trim()
        const copy: Exam = {
          ...ex,
          id,
          title: `${titleBase}${titleBase ? ' ' : ''}(bản sao)`
        }
        set((s) => ({ exams: [...s.exams, copy], selectedExamId: id }))
        return id
      },

      createSubmission: ({ examId, studentId }) => {
        const exam = get().exams.find((e) => e.id === examId)
        const student = get().students.find((st) => st.id === studentId)
        if (!exam || !student) throw new Error('Không tìm thấy bài hoặc học sinh')
        if (student.classId !== exam.classId) throw new Error('Học sinh không thuộc lớp của bài kiểm tra')

        const id = uid('submission')
        const submission: Submission = {
          id,
          examId,
          studentId,
          studentName: student.name,
          imageFiles: [],
          ocrPages: []
        }
        set((s) => ({ submissions: [...s.submissions, submission], selectedSubmissionId: id }))
        return id
      },

      setSubmissionImages: (submissionId, files) => {
        set((s) => ({
          submissions: s.submissions.map((sub) => {
            if (sub.id !== submissionId) return sub
            return { ...sub, imageFiles: files, ocrPages: [], gradingResult: undefined }
          })
        }))
      },

      replaceSubmissionOcrPages: (submissionId, pages) => {
        set((s) => ({
          submissions: s.submissions.map((sub) => {
            if (sub.id !== submissionId) return sub
            const ocrPages = pages.map((p) => ({
              id: uid('ocr'),
              imageName: p.imageName,
              ocrText: p.ocrText,
              confidence: p.confidence,
              correctedText: p.correctedText
            }))
            return { ...sub, ocrPages }
          })
        }))
      },

      setOcrPageCorrectedText: (submissionId, pageId, correctedText) => {
        set((s) => ({
          submissions: s.submissions.map((sub) => {
            if (sub.id !== submissionId) return sub
            return {
              ...sub,
              ocrPages: sub.ocrPages.map((p) => (p.id === pageId ? { ...p, correctedText } : p))
            }
          })
        }))
      },

      setGradingResult: (submissionId, result) => {
        set((s) => ({
          submissions: s.submissions.map((sub) => (sub.id === submissionId ? { ...sub, gradingResult: result } : sub))
        }))
      }
    }),
    {
      name: 'jungedu_app_state_v1',
      version: 4,
      migrate: (persisted: unknown, fromVersion: number) => {
        let state = persisted as Record<string, unknown> | undefined
        if (!state || typeof state !== 'object') return persisted as never

        if (fromVersion < 2) {
          state = migrateToV2(state)
        }
        if (fromVersion < 3) {
          state = migrateRemoveDefaultClass(state)
        }
        if (fromVersion < 4) {
          state = migrateV4RenameLegacyClassTitles(state)
        }
        return state as typeof persisted
      }
    }
  )
)

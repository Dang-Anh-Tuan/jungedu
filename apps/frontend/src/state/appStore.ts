import { create } from 'zustand'
import type { Exam, GradingResult, SchoolClass, Submission, Student, SubmissionImageFile } from '../types'
import {
  batchReplaceStudentsForClassDocs,
  createDocumentId,
  deleteClassCascadeDocs,
  deleteExamAndSubmissionsDocs,
  mergeExamDocPatch,
  mergeSubmissionDoc,
  setExamDoc,
  setSchoolClassDoc,
  setSubmissionDoc,
  stripImageFilesForFirestore
} from '../services/firebase'
import {
  cleanupRemovedSubmissionImages,
  persistUploadedSubmissionImages,
  purgeDriveSubmissionImages,
  purgeLocalSubmissionImageFiles,
  revokeSubmissionImageObjectUrls
} from '../services/storage/submissionImagePersistence'

type AppState = {
  isSyncing: boolean
  teacherName: string
  classes: SchoolClass[]
  students: Student[]
  exams: Exam[]
  submissions: Submission[]
  selectedExamId?: string
  selectedSubmissionId?: string

  createClass: (input: Omit<SchoolClass, 'id'>) => Promise<string>
  deleteClass: (classId: string) => Promise<void>
  importStudentsForClass: (
    classId: string,
    rows: { name: string; studentCode?: string; hocLuc?: string; notes?: string }[]
  ) => Promise<void>

  createExam: (input: Omit<Exam, 'id'>) => Promise<string>
  updateExam: (examId: string, patch: Partial<Omit<Exam, 'id'>>) => Promise<void>
  deleteExam: (examId: string) => Promise<void>
  cloneExam: (examId: string) => Promise<string>

  createSubmission: (input: { examId: string; studentId: string }) => Promise<string>
  setSubmissionImages: (submissionId: string, files: SubmissionImageFile[]) => Promise<void>
  replaceSubmissionOcrPages: (
    submissionId: string,
    pages: { imageName: string; ocrText: string; confidence: number; correctedText: string }[]
  ) => Promise<void>
  setOcrPageCorrectedText: (submissionId: string, pageId: string, correctedText: string) => Promise<void>
  setGradingResult: (submissionId: string, result: GradingResult) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  isSyncing: true,
  teacherName: 'Thầy/Cô',
  classes: [],
  students: [],
  exams: [],
  submissions: [],

  createClass: async (input) => {
    const id = createDocumentId('class')
    const cls: SchoolClass = { id, ...input }
    await setSchoolClassDoc(cls)
    return id
  },

  deleteClass: async (classId) => {
    const studentIds = get()
      .students.filter((st) => st.classId === classId)
      .map((st) => st.id)

    const examsToDelete = get().exams.filter((e) => e.classId === classId)
    const exams = examsToDelete.map((e) => ({
      examId: e.id,
      submissionIds: get()
        .submissions.filter((sub) => sub.examId === e.id)
        .map((sub) => sub.id)
    }))

    await Promise.all(
      exams.flatMap((ex) =>
        ex.submissionIds.map(async (sid) => {
          const sub = get().submissions.find((s) => s.id === sid)
          if (sub?.imageFiles?.length) await purgeDriveSubmissionImages(sub.imageFiles)
          await purgeLocalSubmissionImageFiles(sid)
        })
      )
    )

    await deleteClassCascadeDocs({
      classId,
      studentIds,
      exams
    })
  },

  importStudentsForClass: async (classId, rows) => {
    const cid = typeof classId === 'string' ? classId.trim() : ''
    if (!cid) throw new Error('Thiếu mã lớp (classId).')

    const cleaned = rows
      .map((r) => ({
        name: r.name.trim(),
        studentCode: r.studentCode?.trim() || undefined,
        hocLuc: r.hocLuc?.trim() || undefined,
        notes: r.notes?.trim() || undefined
      }))
      .filter((r) => r.name.length > 0)

    const studentIdsToRemove = get()
      .students.filter((st) => st.classId === cid)
      .map((st) => st.id)

    const studentsToUpsert: Student[] = cleaned.map((r) => ({
      id: createDocumentId('student'),
      classId: cid,
      name: r.name,
      studentCode: r.studentCode,
      hocLuc: r.hocLuc,
      tags: [],
      notes: r.notes ?? '',
      customRules: []
    }))

    await batchReplaceStudentsForClassDocs({
      studentIdsToRemove,
      studentsToUpsert
    })
  },

  createExam: async (input) => {
    const id = createDocumentId('exam')
    const exam: Exam = { id, ...input }
    await setExamDoc(exam)
    set((state) => ({
      exams: [...state.exams.filter((e) => e.id !== id), exam],
      selectedExamId: id
    }))
    return id
  },

  updateExam: async (examId, patch) => {
    await mergeExamDocPatch(examId, patch as Record<string, unknown>)
  },

  deleteExam: async (examId) => {
    const subs = get().submissions.filter((sub) => sub.examId === examId)
    const submissionIds = subs.map((sub) => sub.id)
    await Promise.all(
      subs.map(async (sub) => {
        await purgeDriveSubmissionImages(sub.imageFiles)
        await purgeLocalSubmissionImageFiles(sub.id)
      })
    )
    await deleteExamAndSubmissionsDocs(examId, submissionIds)
  },

  cloneExam: async (examId) => {
    const ex = get().exams.find((e) => e.id === examId)
    if (!ex) throw new Error('Không tìm thấy bài kiểm tra')
    const id = createDocumentId('exam')
    const titleBase = ex.title.trim()
    const copy: Exam = {
      ...ex,
      id,
      title: `${titleBase}${titleBase ? ' ' : ''}(bản sao)`
    }
    await setExamDoc(copy)
    set((state) => ({
      exams: [...state.exams.filter((e) => e.id !== id), copy],
      selectedExamId: id
    }))
    return id
  },

  createSubmission: async ({ examId, studentId }) => {
    const exam = get().exams.find((e) => e.id === examId)
    const student = get().students.find((st) => st.id === studentId)
    if (!exam || !student) throw new Error('Không tìm thấy bài hoặc học sinh')
    if (student.classId !== exam.classId) throw new Error('Học sinh không thuộc lớp của bài kiểm tra')

    const id = createDocumentId('submission')
    const submission: Submission = {
      id,
      examId,
      studentId,
      studentName: student.name,
      imageFiles: [],
      ocrPages: []
    }
    await setSubmissionDoc(submission)
    set((state) => ({
      submissions: [...state.submissions.filter((s) => s.id !== id), submission],
      selectedSubmissionId: id
    }))
    return id
  },

  setSubmissionImages: async (submissionId, files) => {
    const sub = get().submissions.find((s) => s.id === submissionId)
    if (!sub) return

    const before = { ...sub }

    await cleanupRemovedSubmissionImages(sub.imageFiles, files)

    set((state) => ({
      submissions: state.submissions.map((s) =>
        s.id === submissionId ? { ...s, imageFiles: files, ocrPages: [], gradingResult: undefined } : s
      )
    }))

    try {
      const uploadedFiles = await persistUploadedSubmissionImages(submissionId, files)

      for (const f of files) {
        revokeSubmissionImageObjectUrls(f)
      }

      set((state) => ({
        submissions: state.submissions.map((s) =>
          s.id === submissionId ? { ...s, imageFiles: uploadedFiles } : s
        )
      }))

      await mergeSubmissionDoc(submissionId, {
        imageFiles: stripImageFilesForFirestore(uploadedFiles),
        ocrPages: [],
        gradingResult: null,
        visionConvertedAt: null,
        gradedAt: null,
        teacherRevisedAt: null
      })
    } catch (e) {
      set((state) => ({
        submissions: state.submissions.map((s) => (s.id === submissionId ? before : s))
      }))
      throw e
    }
  },

  replaceSubmissionOcrPages: async (submissionId, pages) => {
    const sub = get().submissions.find((s) => s.id === submissionId)
    if (!sub) return

    const now = new Date().toISOString()
    const ocrPages = pages.map((p) => ({
      id: createDocumentId('ocr'),
      imageName: p.imageName,
      ocrText: p.ocrText,
      confidence: p.confidence,
      correctedText: p.correctedText
    }))
    /** Luôn ghi lại imageFiles cùng OCR — tránh snapshot ghi đè làm mất ảnh trên UI / Firestore. */
    await mergeSubmissionDoc(submissionId, {
      imageFiles: stripImageFilesForFirestore(sub.imageFiles),
      ocrPages,
      visionConvertedAt: now,
      gradedAt: null,
      gradingResult: null
    })

    set((state) => ({
      submissions: state.submissions.map((s) =>
        s.id === submissionId
          ? { ...s, ocrPages, visionConvertedAt: now, gradingResult: undefined }
          : s
      )
    }))
  },

  setOcrPageCorrectedText: async (submissionId, pageId, correctedText) => {
    const sub = get().submissions.find((s) => s.id === submissionId)
    if (!sub) return
    const ocrPages = sub.ocrPages.map((p) => (p.id === pageId ? { ...p, correctedText } : p))
    const now = new Date().toISOString()
    await mergeSubmissionDoc(submissionId, {
      imageFiles: stripImageFilesForFirestore(sub.imageFiles),
      ocrPages,
      teacherRevisedAt: now
    })
  },

  setGradingResult: async (submissionId, result) => {
    const sub = get().submissions.find((s) => s.id === submissionId)
    const now = new Date().toISOString()
    await mergeSubmissionDoc(submissionId, {
      ...(sub ? { imageFiles: stripImageFilesForFirestore(sub.imageFiles) } : {}),
      gradingResult: result,
      gradedAt: now
    })
    set((state) => ({
      submissions: state.submissions.map((s) =>
        s.id === submissionId ? { ...s, gradingResult: result, gradedAt: now } : s
      )
    }))
  }
}))

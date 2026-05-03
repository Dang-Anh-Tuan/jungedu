import { create } from 'zustand'
import { collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore'
import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import type { Exam, GradingResult, SchoolClass, Submission, Student } from '../types'

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

function cleanData<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(cleanData) as unknown as T
  const copy: any = {}
  for (const key in obj) {
    if ((obj as any)[key] !== undefined) {
      copy[key] = cleanData((obj as any)[key])
    }
  }
  return copy as T
}

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
  setSubmissionImages: (
    submissionId: string,
    files: { id: string; name: string; objectUrl: string; dataUrl: string }[]
  ) => Promise<void>
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
    const id = uid('class')
    const cls: SchoolClass = { id, ...input }
    await setDoc(doc(db, 'classes', id), cleanData(cls))
    return id
  },

  deleteClass: async (classId) => {
    const batch = writeBatch(db)
    batch.delete(doc(db, 'classes', classId))
    
    // delete students in this class
    get().students.filter(st => st.classId === classId).forEach(st => {
      batch.delete(doc(db, 'students', st.id))
    })

    // delete exams and submissions
    const examsToDelete = get().exams.filter(e => e.classId === classId)
    examsToDelete.forEach(e => {
      batch.delete(doc(db, 'exams', e.id))
      get().submissions.filter(sub => sub.examId === e.id).forEach(sub => {
        batch.delete(doc(db, 'submissions', sub.id))
      })
    })

    await batch.commit()
  },

  importStudentsForClass: async (classId, rows) => {
    const cleaned = rows
      .map((r) => ({
        name: r.name.trim(),
        studentCode: r.studentCode?.trim() || undefined,
        hocLuc: r.hocLuc?.trim() || undefined,
        notes: r.notes?.trim() || undefined
      }))
      .filter((r) => r.name.length > 0)

    const batch = writeBatch(db)
    
    // Remove existing students for this class
    get().students.filter(st => st.classId === classId).forEach(st => {
      batch.delete(doc(db, 'students', st.id))
    })

    for (const r of cleaned) {
      const id = uid('student')
      batch.set(doc(db, 'students', id), cleanData({
        id,
        classId,
        name: r.name,
        studentCode: r.studentCode,
        hocLuc: r.hocLuc,
        tags: [],
        notes: r.notes ?? '',
        customRules: []
      }))
    }
    await batch.commit()
  },

  createExam: async (input) => {
    const id = uid('exam')
    const exam: Exam = { id, ...input }
    await setDoc(doc(db, 'exams', id), cleanData(exam))
    set({ selectedExamId: id })
    return id
  },

  updateExam: async (examId, patch) => {
    await setDoc(doc(db, 'exams', examId), cleanData(patch), { merge: true })
  },

  deleteExam: async (examId) => {
    const batch = writeBatch(db)
    batch.delete(doc(db, 'exams', examId))
    get().submissions.filter(sub => sub.examId === examId).forEach(sub => {
      batch.delete(doc(db, 'submissions', sub.id))
    })
    await batch.commit()
  },

  cloneExam: async (examId) => {
    const ex = get().exams.find((e) => e.id === examId)
    if (!ex) throw new Error('Không tìm thấy bài kiểm tra')
    const id = uid('exam')
    const titleBase = ex.title.trim()
    const copy: Exam = {
      ...ex,
      id,
      title: `${titleBase}${titleBase ? ' ' : ''}(bản sao)`
    }
    await setDoc(doc(db, 'exams', id), cleanData(copy))
    set({ selectedExamId: id })
    return id
  },

  createSubmission: async ({ examId, studentId }) => {
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
    await setDoc(doc(db, 'submissions', id), cleanData(submission))
    set({ selectedSubmissionId: id })
    return id
  },

  setSubmissionImages: async (submissionId, files) => {
    const sub = get().submissions.find(s => s.id === submissionId)
    if (!sub) return

    // Optimistic UI update
    set((state) => ({
      submissions: state.submissions.map((s) => 
        s.id === submissionId ? { ...s, imageFiles: files, ocrPages: [], gradingResult: undefined } : s
      )
    }))

    // Upload files to Firebase Storage first if they are dataUrls (base64)
    const uploadedFiles = await Promise.all(files.map(async (file) => {
      if (file.dataUrl.startsWith('http')) {
        return file
      }
      try {
        const storageRef = ref(storage, `submissions/${submissionId}/${file.id}.jpg`)
        await uploadString(storageRef, file.dataUrl, 'data_url')
        const downloadUrl = await getDownloadURL(storageRef)
        return {
          ...file,
          dataUrl: downloadUrl // Replace base64 with Firebase Storage URL
        }
      } catch (err) {
        console.error("Failed to upload image to Firebase Storage, falling back to base64", err)
        return file
      }
    }))

    const updated = {
      imageFiles: uploadedFiles,
      ocrPages: [],
      gradingResult: null
    }
    
    await setDoc(doc(db, 'submissions', submissionId), cleanData(updated), { merge: true })
  },

  replaceSubmissionOcrPages: async (submissionId, pages) => {
    const ocrPages = pages.map((p) => ({
      id: uid('ocr'),
      imageName: p.imageName,
      ocrText: p.ocrText,
      confidence: p.confidence,
      correctedText: p.correctedText
    }))
    await setDoc(doc(db, 'submissions', submissionId), cleanData({ ocrPages }), { merge: true })
  },

  setOcrPageCorrectedText: async (submissionId, pageId, correctedText) => {
    const sub = get().submissions.find((s) => s.id === submissionId)
    if (!sub) return
    const ocrPages = sub.ocrPages.map((p) => (p.id === pageId ? { ...p, correctedText } : p))
    await setDoc(doc(db, 'submissions', submissionId), cleanData({ ocrPages }), { merge: true })
  },

  setGradingResult: async (submissionId, result) => {
    await setDoc(doc(db, 'submissions', submissionId), cleanData({ gradingResult: result }), { merge: true })
  }
}))

export function initFirebaseSync() {
  onSnapshot(collection(db, 'classes'), (snap) => {
    useAppStore.setState({ classes: snap.docs.map(d => d.data() as SchoolClass) })
  })

  onSnapshot(collection(db, 'students'), (snap) => {
    useAppStore.setState({ students: snap.docs.map(d => d.data() as Student) })
  })

  onSnapshot(collection(db, 'exams'), (snap) => {
    useAppStore.setState({ exams: snap.docs.map(d => d.data() as Exam) })
  })

  onSnapshot(collection(db, 'submissions'), (snap) => {
    const submissions = snap.docs.map(d => {
      const data = d.data() as any
      if (data.gradingResult === null) data.gradingResult = undefined
      return data as Submission
    })
    useAppStore.setState({ submissions, isSyncing: false })
  })
}

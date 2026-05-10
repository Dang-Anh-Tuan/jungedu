import React, { useMemo, useRef, useState, useEffect } from 'react'
import ReactCrop, { type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppStore } from '../state/appStore'
import type { Submission, SubmissionImageFile } from '../types'
import { fileToDataUrl } from '../lib/fileDataUrl'
import { sortFilesNatural } from '../lib/bulkFiles'
import { runImageToText } from '../services/imageToText'
import { getTeacherGradingExperienceCached } from '../services/appSettings/teacherGradingExperiencePref'
import { runAiGrade } from '../services/aiClient'
import { submissionAiMatchPercent } from '../lib/textSimilarity'
import { getSubmissionImageStorageMode } from '../services/config'
import { resolveSubmissionImageWorkUrl } from '../services/storage/submissionImagePersistence'
import {
  getStoredGoogleDriveAccessToken,
  refreshGoogleDriveTokenSilent
} from '../services/googleDrive/oauth'
import { downloadGoogleDriveFileBlob } from '../services/googleDrive/upload'
import {
  buildStudentResultRows,
  exportSelectedDetailedReviewPdf,
  exportSelectedResultsSummaryPdf,
  exportSelectedResultsToExcel
} from '../services/export/reportExport'
import SubmissionImageThumb from '../components/SubmissionImageThumb'

type SelectedFile = SubmissionImageFile

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

async function dataUrlToFile(dataUrl: string, fileName: string) {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], fileName, { type: blob.type || 'image/*' })
}

async function toOcrInputFile(
  img: SubmissionImageFile
): Promise<{ file: File; cleanupObjectUrl?: string }> {
  if (img.storageKind === 'gdrive' && img.driveFileId) {
    const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID?.trim()
    if (!clientId) {
      throw new Error('Thiếu VITE_GOOGLE_OAUTH_CLIENT_ID trong file .env')
    }
    const token =
      getStoredGoogleDriveAccessToken() ?? (await refreshGoogleDriveTokenSilent(clientId)) ?? undefined
    if (!token) {
      throw new Error('Phiên Google Drive đã hết hạn. Hãy đăng xuất rồi đăng nhập lại.')
    }
    const blob = await downloadGoogleDriveFileBlob(token, img.driveFileId)
    return {
      file: new File([blob], img.name || `drive_${img.driveFileId}.jpg`, {
        type: blob.type || 'image/jpeg'
      })
    }
  }

  const { url, revokeWhenDone } = await resolveSubmissionImageWorkUrl(img)
  if (!url) {
    throw new Error('Không đọc được ảnh để chuyển chữ.')
  }
  const file = await dataUrlToFile(url, img.name)
  return { file, cleanupObjectUrl: revokeWhenDone && url.startsWith('blob:') ? url : undefined }
}

async function ensureSubmissionId(examId: string, studentId: string): Promise<string> {
  const { submissions, createSubmission } = useAppStore.getState()
  const list = submissions.filter((s) => s.examId === examId && s.studentId === studentId)
  const existing = list.at(-1)
  if (existing) return existing.id
  return createSubmission({ examId, studentId })
}

function submissionForStudent(submissions: Submission[], examId: string, studentId: string) {
  const list = submissions.filter((s) => s.examId === examId && s.studentId === studentId)
  return list.at(-1)
}

// Full-screen camera and crop modal with react-image-crop
function CameraCropModal({ onSave, onClose }: { onSave: (file: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)

  // react-image-crop state
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>({ unit: '%', x: 5, y: 5, width: 90, height: 90 })
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null)

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        setStream(s)
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch((err) => {
        toast.error('Không thể truy cập camera')
        onClose()
      })
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, []) // eslint-disable-line

  const handleCapture = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(videoRef.current, 0, 0)
    setCapturedUrl(canvas.toDataURL('image/jpeg'))
    stream?.getTracks().forEach((t) => t.stop())
  }

  const handleSave = async () => {
    if (!capturedUrl || !completedCrop || !imgRef.current) return
    
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = completedCrop.width * scaleX
    canvas.height = completedCrop.height * scaleY

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    )

    const finalUrl = canvas.toDataURL('image/jpeg')
    const file = await dataUrlToFile(finalUrl, `crop_${Date.now()}.jpg`)
    onSave(file)
  }

  return (
    <div className="fixed top-0 left-0 w-screen h-[100dvh] z-[9999] bg-black flex flex-col items-center justify-center sm:p-4 touch-none">
      <div className="bg-black sm:bg-white sm:rounded-2xl w-full h-full sm:max-w-xl sm:h-[90vh] overflow-hidden flex flex-col relative">
        <div className="p-4 flex justify-between items-center text-white sm:text-slate-900 absolute top-0 left-0 right-0 z-10 sm:relative sm:border-b sm:border-slate-100 bg-black/40 sm:bg-transparent">
          <h3 className="font-semibold">{capturedUrl ? 'Cắt ảnh' : 'Chụp ảnh'}</h3>
          <button onClick={onClose} className="p-2 -mr-2 font-bold hover:opacity-80">✕</button>
        </div>
        
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-auto">
          {!capturedUrl ? (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <ReactCrop
              crop={crop}
              onChange={c => setCrop(c)}
              onComplete={c => setCompletedCrop(c)}
            >
              <img
                ref={imgRef}
                src={capturedUrl}
                className="max-h-[80vh] w-auto"
                alt="Crop me"
              />
            </ReactCrop>
          )}
        </div>

        <div className="p-4 flex justify-end gap-3 absolute bottom-0 left-0 right-0 z-10 sm:relative sm:border-t sm:border-slate-100 bg-black/60 sm:bg-white backdrop-blur-sm sm:backdrop-blur-none">
          {!capturedUrl ? (
            <button className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-3 sm:py-2 rounded-xl font-medium" onClick={handleCapture}>Chụp</button>
          ) : (
            <>
              <button className="flex-1 sm:flex-none px-4 py-3 sm:py-2 text-sm text-white sm:text-slate-600 hover:bg-slate-800 sm:hover:bg-slate-50 rounded-xl" onClick={() => setCapturedUrl(null)}>Chụp lại</button>
              <button className="flex-1 sm:flex-none bg-emerald-600 text-white px-6 py-3 sm:py-2 rounded-xl font-medium" onClick={handleSave}>Lưu ảnh</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


export default function SubmissionImportPage() {
  const navigate = useNavigate()
  const { examId } = useParams()
  const exams = useAppStore((s) => s.exams)
  const classes = useAppStore((s) => s.classes)
  const students = useAppStore((s) => s.students)
  const submissions = useAppStore((s) => s.submissions)
  const setSubmissionImages = useAppStore((s) => s.setSubmissionImages)
  const replaceSubmissionOcrPages = useAppStore((s) => s.replaceSubmissionOcrPages)

  const exam = exams.find((e) => e.id === examId)

  const classStudents = useMemo(() => {
    if (!exam) return []
    return students.filter((s) => s.classId === exam.classId)
  }, [exam, students])

  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({})
  
  // States for individual actions
  const [loadingPick, setLoadingPick] = useState<string | null>(null)
  const [activeCameraStudentId, setActiveCameraStudentId] = useState<string | null>(null)

  // Progress states for ALL actions
  const [processingState, setProcessingState] = useState<{
    type: 'convert' | 'grade' | null;
    current: number;
    total: number;
    activeStudentId: string | null;
  }>({ type: null, current: 0, total: 0, activeStudentId: null })

  // Warning modal states
  const [warnModal, setWarnModal] = useState<{
    type: 'convert' | 'grade' | 'convert_all' | 'grade_all';
    studentId?: string; // missing if 'all'
  } | null>(null)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  async function onPickImages(studentId: string, list: FileList | null) {
    if (!examId || !list?.length) return
    setLoadingPick(studentId)
    try {
      const raw = Array.from(list).filter((f) => f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name))
      const sorted = sortFilesNatural(raw)
      const simplified: SelectedFile[] = []
      for (const file of sorted) {
        const dataUrl = await fileToDataUrl(file)
        simplified.push({
          id: uid('img'),
          name: file.name,
          dataUrl,
          objectUrl: URL.createObjectURL(file)
        })
      }
      const submissionId = await ensureSubmissionId(examId, studentId)
      // Append to existing instead of replace if capturing from camera?
      // Wait, original code replaces. We will keep replace to match input type="file" multiple.
      await setSubmissionImages(submissionId, simplified)
      toast.success(`Đã lưu ${simplified.length} ảnh.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được ảnh (kiểm tra Drive / Firebase / Console).')
    } finally {
      setLoadingPick(null)
    }
  }

  async function onSaveCameraImage(file: File) {
    if (!activeCameraStudentId || !examId) return
    const sid = activeCameraStudentId
    setActiveCameraStudentId(null)
    
    const subId = await ensureSubmissionId(examId, sid)
    const existingSub = submissions.find(s => s.id === subId)
    const existingImages = existingSub?.imageFiles || []
    
    const dataUrl = await fileToDataUrl(file)
    const newImg: SelectedFile = {
      id: uid('img'),
      name: file.name,
      dataUrl,
      objectUrl: URL.createObjectURL(file)
    }
    
    try {
      await setSubmissionImages(subId, [...existingImages, newImg])
      toast.success('Đã thêm ảnh vừa chụp.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được ảnh.')
    }
  }

  // --- Core API Executions ---
  async function executeVisionConvert(studentId: string, silent = false) {
    if (!examId) return false
    const sub = submissionForStudent(useAppStore.getState().submissions, examId, studentId)
    if (!sub || sub.imageFiles.length === 0) {
      if (!silent) toast.error('Chưa có ảnh.')
      return false
    }
    try {
      const pages: { imageName: string; ocrText: string; confidence: number; correctedText: string }[] = []
      for (const img of sub.imageFiles) {
        let cleanupObjectUrl: string | undefined
        try {
          const prepared = await toOcrInputFile(img)
          const file = prepared.file
          cleanupObjectUrl = prepared.cleanupObjectUrl
          const { text, confidence } = await runImageToText(file)
          pages.push({ imageName: img.name, ocrText: text, confidence, correctedText: text })
        } finally {
          if (cleanupObjectUrl) URL.revokeObjectURL(cleanupObjectUrl)
        }
      }
      useAppStore.getState().replaceSubmissionOcrPages(sub.id, pages)
      if (!silent) toast.success(`Đã chuyển xong.`)
      return true
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : 'Không chuyển được ảnh sang chữ.')
      return false
    }
  }

  async function executeGrade(studentId: string, silent = false) {
    if (!examId || !exam) return false
    const sub = submissionForStudent(useAppStore.getState().submissions, examId, studentId)
    const student = useAppStore.getState().students.find((s) => s.id === studentId)
    if (!sub || !student) return false
    const text = sub.ocrPages.map((p) => p.correctedText).join('\n').trim()
    if (!text) {
      if (!silent) toast.error('Chưa có chữ từ ảnh.')
      return false
    }
    try {
      const result = await runAiGrade({
        essayText: text,
        exam: {
          title: exam.title, subject: exam.subject, grade: exam.grade,
          requirements: exam.requirements, rubric: exam.rubric, teacherStyle: exam.teacherStyle
        },
        student: {
          name: student.name, tags: student.tags, notes: student.notes,
          hocLuc: student.hocLuc
        },
        teacherGradingExperience: getTeacherGradingExperienceCached()
      })
      await useAppStore.getState().setGradingResult(sub.id, result)
      if (!silent) toast.success('Đã chấm xong.')
      return true
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : String(e))
      return false
    }
  }

  // --- Handlers ---
  function requestConvert(studentId: string) {
    const sub = submissionForStudent(submissions, examId!, studentId)
    if (sub && sub.ocrPages.length > 0) {
      setWarnModal({ type: 'convert', studentId })
    } else {
      setProcessingState({ type: 'convert', current: 0, total: 1, activeStudentId: studentId })
      executeVisionConvert(studentId).finally(() => setProcessingState({ type: null, current: 0, total: 0, activeStudentId: null }))
    }
  }

  function requestGrade(studentId: string) {
    const sub = submissionForStudent(submissions, examId!, studentId)
    if (sub && sub.gradingResult) {
      setWarnModal({ type: 'grade', studentId })
    } else {
      setProcessingState({ type: 'grade', current: 0, total: 1, activeStudentId: studentId })
      executeGrade(studentId).finally(() => setProcessingState({ type: null, current: 0, total: 0, activeStudentId: null }))
    }
  }

  function requestConvertAll() {
    // Check if any has OCR already
    const hasExisting = classStudents.some(st => submissionForStudent(submissions, examId!, st.id)?.ocrPages.length)
    if (hasExisting) {
      setWarnModal({ type: 'convert_all' })
    } else {
      executeConvertAll()
    }
  }

  function requestGradeAll() {
    const hasExisting = classStudents.some(st => submissionForStudent(submissions, examId!, st.id)?.gradingResult)
    if (hasExisting) {
      setWarnModal({ type: 'grade_all' })
    } else {
      executeGradeAll()
    }
  }

  async function executeConvertAll() {
    setWarnModal(null)
    const targets = classStudents.filter(st => {
      const sub = submissionForStudent(useAppStore.getState().submissions, examId!, st.id)
      return sub && sub.imageFiles.length > 0
    })
    if (targets.length === 0) {
      toast.info('Không có học sinh nào có ảnh để chuyển.')
      return
    }
    
    setProcessingState({ type: 'convert', current: 0, total: targets.length, activeStudentId: null })
    let success = 0
    for (let i = 0; i < targets.length; i++) {
      setProcessingState(prev => ({ ...prev, current: i, activeStudentId: targets[i].id }))
      const ok = await executeVisionConvert(targets[i].id, true)
      if (ok) success++
    }
    setProcessingState({ type: null, current: 0, total: 0, activeStudentId: null })
    toast.success(`Đã chuyển xong ${success}/${targets.length} học sinh.`)
  }

  async function executeGradeAll() {
    setWarnModal(null)
    const targets = classStudents.filter(st => {
      const sub = submissionForStudent(useAppStore.getState().submissions, examId!, st.id)
      return sub && sub.ocrPages.length > 0
    })
    if (targets.length === 0) {
      toast.info('Không có học sinh nào có chữ để chấm.')
      return
    }

    setProcessingState({ type: 'grade', current: 0, total: targets.length, activeStudentId: null })
    let success = 0
    for (let i = 0; i < targets.length; i++) {
      setProcessingState(prev => ({ ...prev, current: i, activeStudentId: targets[i].id }))
      const ok = await executeGrade(targets[i].id, true)
      if (ok) success++
    }
    setProcessingState({ type: null, current: 0, total: 0, activeStudentId: null })
    toast.success(`Đã chấm xong ${success}/${targets.length} học sinh.`)
  }

  async function confirmWarnModal() {
    const w = warnModal
    setWarnModal(null)
    if (!w) return
    
    if (w.type === 'convert' && w.studentId) {
      setProcessingState({ type: 'convert', current: 0, total: 1, activeStudentId: w.studentId })
      await executeVisionConvert(w.studentId)
      setProcessingState({ type: null, current: 0, total: 0, activeStudentId: null })
    } else if (w.type === 'grade' && w.studentId) {
      setProcessingState({ type: 'grade', current: 0, total: 1, activeStudentId: w.studentId })
      await executeGrade(w.studentId)
      setProcessingState({ type: null, current: 0, total: 0, activeStudentId: null })
    } else if (w.type === 'convert_all') {
      await executeConvertAll()
    } else if (w.type === 'grade_all') {
      await executeGradeAll()
    }
  }

  if (!exam) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-lg font-semibold text-slate-900">Không tìm thấy bài kiểm tra</div>
        <Link to="/" className="text-emerald-700 text-sm mt-4 inline-block">← Trang chủ</Link>
      </div>
    )
  }

  const isBusy = processingState.type !== null
  const driveModeActive = getSubmissionImageStorageMode() === 'gdrive'
  const gradedStudents = classStudents.filter((st) => {
    const sub = submissionForStudent(submissions, exam.id, st.id)
    return !!sub?.gradingResult
  })
  const selectedStudentsForExport = gradedStudents.filter((st) =>
    selectedStudentIds.includes(st.id)
  )
  const allGradedSelected =
    gradedStudents.length > 0 && selectedStudentsForExport.length === gradedStudents.length

  const toggleStudentExport = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  const toggleSelectAllExport = () => {
    if (allGradedSelected) {
      setSelectedStudentIds([])
      return
    }
    setSelectedStudentIds(gradedStudents.map((s) => s.id))
  }

  const selectedSubmissions = selectedStudentsForExport
    .map((st) => submissionForStudent(submissions, exam.id, st.id))
    .filter((s): s is Submission => !!s)

  const exportRows = buildStudentResultRows({
    students: selectedStudentsForExport,
    submissions: selectedSubmissions
  })

  const ensureHasSelection = (): boolean => {
    if (selectedStudentsForExport.length === 0) {
      toast.error('Hãy tick chọn ít nhất 1 học sinh đã có kết quả chấm.')
      return false
    }
    return true
  }

  const onExportDetailedPdf = () => {
    if (!ensureHasSelection()) return
    exportSelectedDetailedReviewPdf({
      exam,
      students: selectedStudentsForExport,
      submissions: selectedSubmissions
    })
    toast.success('Đã xuất PDF chi tiết.')
  }

  const onExportSummaryPdf = () => {
    if (!ensureHasSelection()) return
    exportSelectedResultsSummaryPdf(exportRows, exam.title)
    toast.success('Đã xuất PDF bảng điểm.')
  }

  const onExportExcel = async () => {
    if (!ensureHasSelection()) return
    await exportSelectedResultsToExcel(exportRows, exam.title)
    toast.success('Đã xuất Excel bảng điểm.')
  }

  const handleDeleteImage = async (subId: string, imgId: string) => {
    if (!globalThis.confirm('Bạn có chắc chắn muốn xóa ảnh này không?')) return
    const sub = submissions.find((s) => s.id === subId)
    if (!sub) return
    try {
      await setSubmissionImages(
        subId,
        sub.imageFiles.filter((img) => img.id !== imgId)
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không cập nhật được danh sách ảnh.')
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8 px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Nhập bài làm</h1>
          <p className="text-sm text-slate-600 mt-1">
            {exam.title} · Lớp {classes.find((c) => c.id === exam.classId)?.name ?? '—'}
            {driveModeActive ? (
              <span className="block mt-1 text-xs text-slate-500">
                Lưu ảnh Drive:{' '}
                <Link to="/profile" className="font-medium text-emerald-800 hover:underline">
                  Cài đặt → Kết nối Drive / thư mục
                </Link>
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            disabled={isBusy}
            onClick={requestConvertAll}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
          >
            Chuyển tất cả ảnh sang chữ
          </button>
          <button 
            disabled={isBusy}
            onClick={requestGradeAll}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Chấm điểm cả lớp
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Xuất báo cáo kết quả</div>
            <p className="text-xs text-slate-600 mt-0.5">
              Tick học sinh đã chấm để xuất PDF chi tiết (kiểu Duyệt kết quả), PDF bảng điểm hoặc Excel.
            </p>
          </div>
          <label className="text-xs font-medium text-slate-700 flex items-center gap-2">
            <input
              type="checkbox"
              checked={allGradedSelected}
              onChange={toggleSelectAllExport}
              className="rounded border-slate-300"
            />
            Chọn tất cả đã chấm ({gradedStudents.length})
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onExportDetailedPdf}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
          >
            Export PDF chi tiết
          </button>
          <button
            type="button"
            onClick={onExportSummaryPdf}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
          >
            Export PDF bảng điểm
          </button>
          <button
            type="button"
            onClick={() => void onExportExcel()}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
          >
            Export Excel bảng điểm
          </button>
        </div>
      </div>

      {/* Progress Bar Overlay */}
      {isBusy && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm flex flex-col gap-2">
          <div className="flex justify-between text-sm font-medium text-emerald-800">
            <span>Đang {processingState.type === 'convert' ? 'chuyển ảnh sang chữ' : 'chấm điểm'}...</span>
            <span>{Math.round((processingState.current / processingState.total) * 100)}% ({processingState.current}/{processingState.total})</span>
          </div>
          <div className="h-2 w-full rounded-full bg-emerald-200 overflow-hidden">
            <div 
              className="h-full bg-emerald-600 transition-all duration-300" 
              style={{ width: `${(processingState.current / processingState.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      {classStudents.length === 0 ? (
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-950">
          Chưa có học sinh trong lớp.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="bg-slate-50 text-left border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Chọn export</th>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Họ và tên</th>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap min-w-[180px]">Ảnh bài làm</th>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Xem trước</th>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Chuyển ảnh sang chữ</th>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Khớp AI</th>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Chấm điểm</th>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">Kết quả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map((st) => {
                const sub = submissionForStudent(submissions, exam.id, st.id)
                const nImg = sub?.imageFiles.length ?? 0
                const hasPages = (sub?.ocrPages.length ?? 0) > 0
                const hasGraded = !!sub?.gradingResult
                
                const isThisConverting = processingState.type === 'convert' && processingState.activeStudentId === st.id
                const isThisGrading = processingState.type === 'grade' && processingState.activeStudentId === st.id

                return (
                  <tr key={st.id} className="align-middle hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(st.id)}
                        disabled={!hasGraded}
                        onChange={() => toggleStudentExport(st.id)}
                        className="rounded border-slate-300"
                        title={hasGraded ? 'Chọn để export' : 'Cần chấm điểm trước'}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {st.name}
                      {st.studentCode && <div className="font-mono text-xs text-slate-500 font-normal">{st.studentCode}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <input
                          ref={(el) => { fileInputsRef.current[st.id] = el }}
                          type="file" accept="image/*" multiple className="hidden"
                          onChange={(e) => { void onPickImages(st.id, e.target.files); e.target.value = '' }}
                        />
                        <button
                          type="button" disabled={isBusy}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                          onClick={() => fileInputsRef.current[st.id]?.click()}
                        >
                          Tải lên
                        </button>
                        <button
                          type="button" disabled={isBusy}
                          className="rounded-lg bg-slate-100 text-slate-700 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-200 disabled:opacity-50"
                          onClick={() => setActiveCameraStudentId(st.id)}
                        >
                          Chụp ảnh
                        </button>
                      </div>
                      {nImg > 0 && <div className="text-[10px] text-slate-500 mt-1">{nImg} ảnh</div>}
                    </td>
                    <td className="px-4 py-3">
                      {nImg === 0 || !sub ? <span className="text-slate-300">—</span> : (
                        <div className="flex gap-2 flex-wrap">
                          {sub.imageFiles.map((img) => (
                            <div key={img.id} className="relative group">
                              <SubmissionImageThumb
                                img={img}
                                alt=""
                                className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                              />
                              <button
                                onClick={() => handleDeleteImage(sub.id, img.id)}
                                disabled={isBusy}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-0"
                                title="Xoá ảnh"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button" disabled={nImg === 0 || isBusy}
                          className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-40 whitespace-nowrap"
                          onClick={() => requestConvert(st.id)}
                        >
                          {isThisConverting ? 'Đang chuyển…' : 'Chuyển sang chữ'}
                        </button>
                        {hasPages && sub && (
                          <button
                            type="button" disabled={isBusy}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium hover:bg-slate-50 whitespace-nowrap text-slate-600"
                            onClick={() => navigate(`/submissions/${sub.id}/sua-bai`)}
                          >
                            Sửa chữ
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">
                      {hasPages && sub ? `${submissionAiMatchPercent(sub.ocrPages)}%` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button" disabled={!hasPages || isBusy}
                        className="rounded-lg bg-slate-800 text-white px-3 py-1.5 text-xs font-medium hover:bg-slate-900 disabled:opacity-40 whitespace-nowrap"
                        onClick={() => requestGrade(st.id)}
                      >
                        {isThisGrading ? 'Đang chấm…' : 'Chấm điểm'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button" disabled={!hasGraded || isBusy}
                        className="rounded-lg border border-emerald-200 text-emerald-800 px-3 py-1.5 text-xs font-medium hover:bg-emerald-50 disabled:opacity-40 whitespace-nowrap"
                        onClick={() => navigate(`/submissions/${sub?.id}/review`)}
                      >
                        Kết quả
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Camera Modal */}
      {activeCameraStudentId && (
        <CameraCropModal 
          onSave={onSaveCameraImage} 
          onClose={() => setActiveCameraStudentId(null)} 
        />
      )}

      {/* Warning Modal */}
      {warnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-100">
            <h3 className="font-semibold text-slate-900 text-lg">Cảnh báo ghi đè</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {(warnModal.type === 'convert' || warnModal.type === 'convert_all') && 'Học sinh này đã có chữ (có thể đã chỉnh sửa tay). Bạn có chắc muốn chạy AI nhận diện lại và ghi đè?'}
              {(warnModal.type === 'grade' || warnModal.type === 'grade_all') && 'Học sinh này đã có kết quả chấm điểm. Chấm lại sẽ thay thế kết quả và nhận xét cũ.'}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50" onClick={() => setWarnModal(null)}>Huỷ</button>
              <button className="rounded-xl bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700" onClick={confirmWarnModal}>Ghi đè</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

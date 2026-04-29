import React, { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppStore } from '../state/appStore'
import type { Submission } from '../types'
import { describeImageToTextBackend } from '../services/config'
import { fileToDataUrl } from '../lib/fileDataUrl'
import { sortFilesNatural } from '../lib/bulkFiles'
import { runImageToText } from '../services/imageToText'
import { runAiGrade } from '../services/aiClient'
import { submissionAiMatchPercent } from '../lib/textSimilarity'

type SelectedFile = { id: string; name: string; dataUrl: string; objectUrl: string }

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

async function dataUrlToFile(dataUrl: string, fileName: string) {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], fileName, { type: blob.type || 'image/*' })
}

function ensureSubmissionId(examId: string, studentId: string): string {
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

/** Đã chỉnh correctedText khác bản nhận dạng ban đầu (ocrText). */
function userEditedSinceAi(sub: Submission): boolean {
  return sub.ocrPages.some((p) => (p.correctedText ?? '') !== (p.ocrText ?? ''))
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
  const setGradingResult = useAppStore((s) => s.setGradingResult)

  const exam = exams.find((e) => e.id === examId)

  const classStudents = useMemo(() => {
    if (!exam) return []
    return students.filter((s) => s.classId === exam.classId)
  }, [exam, students])

  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({})
  const [loadingPick, setLoadingPick] = useState<string | null>(null)
  const [convertBusy, setConvertBusy] = useState<string | null>(null)
  const [gradeBusy, setGradeBusy] = useState<string | null>(null)
  const [convertWarn, setConvertWarn] = useState<{ studentId: string } | null>(null)
  const [convertAck, setConvertAck] = useState(false)

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
      const submissionId = ensureSubmissionId(examId, studentId)
      setSubmissionImages(submissionId, simplified)
      const name = students.find((s) => s.id === studentId)?.name ?? ''
      toast.success(`Đã lưu ${simplified.length} ảnh cho ${name}.`)
    } finally {
      setLoadingPick(null)
    }
  }

  async function executeVisionConvert(studentId: string) {
    if (!examId) return
    const sub = submissionForStudent(useAppStore.getState().submissions, examId, studentId)
    if (!sub || sub.imageFiles.length === 0) {
      toast.error('Chưa có ảnh cho học sinh này.')
      return
    }
    setConvertBusy(studentId)
    try {
      const pages: { imageName: string; ocrText: string; confidence: number; correctedText: string }[] = []
      for (const img of sub.imageFiles) {
        const file = await dataUrlToFile(img.dataUrl, img.name)
        const { text, confidence } = await runImageToText(file)
        pages.push({
          imageName: img.name,
          ocrText: text,
          confidence,
          correctedText: text
        })
      }
      replaceSubmissionOcrPages(sub.id, pages)
      toast.success(`Đã chuyển xong ${pages.length} trang bài làm.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không chuyển được ảnh sang chữ.')
    } finally {
      setConvertBusy(null)
    }
  }

  function requestConvertToText(studentId: string) {
    if (!examId) return
    const sub = submissionForStudent(useAppStore.getState().submissions, examId, studentId)
    if (!sub || sub.imageFiles.length === 0) {
      toast.error('Chưa có ảnh cho học sinh này.')
      return
    }
    if (sub.ocrPages.length > 0 && userEditedSinceAi(sub)) {
      setConvertWarn({ studentId })
      setConvertAck(false)
      return
    }
    void executeVisionConvert(studentId)
  }

  async function confirmOverwriteConvert() {
    if (!convertWarn || !convertAck || !examId) return
    const sid = convertWarn.studentId
    setConvertWarn(null)
    setConvertAck(false)
    await executeVisionConvert(sid)
  }

  async function onGrade(studentId: string) {
    if (!examId || !exam) return
    const sub = submissionForStudent(submissions, examId, studentId)
    const student = students.find((s) => s.id === studentId)
    if (!sub || !student) return
    const text = sub.ocrPages.map((p) => p.correctedText).join('\n').trim()
    if (!text) {
      toast.error('Chưa có chữ từ ảnh — hãy chuyển ảnh sang chữ và chỉnh nếu cần.')
      return
    }
    setGradeBusy(studentId)
    try {
      const result = await runAiGrade({
        ocrText: text,
        exam: {
          title: exam.title,
          subject: exam.subject,
          grade: exam.grade,
          requirements: exam.requirements,
          rubric: exam.rubric,
          teacherStyle: exam.teacherStyle
        },
        student: {
          name: student.name,
          tags: student.tags,
          notes: student.notes,
          customRules: student.customRules,
          hocLuc: student.hocLuc
        }
      })
      setGradingResult(sub.id, result)
      toast.success('Đã chấm xong.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setGradeBusy(null)
    }
  }

  if (!exam) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-lg font-semibold text-slate-900">Không tìm thấy bài kiểm tra</div>
        <p className="text-sm text-slate-600 mt-2">Quay lại trang chủ và tạo lại.</p>
        <Link to="/" className="text-emerald-700 text-sm mt-4 inline-block">
          ← Trang chủ
        </Link>
      </div>
    )
  }

  const cls = classes.find((c) => c.id === exam.classId)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Nhập bài làm</h1>
          <p className="text-sm text-slate-600 mt-1">
            {exam.title} · Lớp {cls?.name ?? '—'} · {exam.subject}
          </p>
          <p className="text-xs text-slate-500 mt-2 max-w-2xl">
            Ảnh → chữ: {describeImageToTextBackend()}. Thứ tự ảnh sau khi chọn được sắp theo tên file (chuẩn tiếng Việt + số).
          </p>
        </div>
        <Link to="/" className="text-sm text-slate-600 hover:text-slate-900 py-2">
          Trang chủ
        </Link>
      </div>

      {classStudents.length === 0 ? (
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-950">
          Chưa có học sinh trong lớp của bài này. Hãy{' '}
          <Link to="/classes" className="font-medium underline">
            Trang Lớp — import Excel
          </Link>{' '}
          trước.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full text-sm">
              <thead className="bg-slate-50 text-left border-b border-slate-100">
                <tr>
                  <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Mã HS</th>
                  <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Họ và tên</th>
                  <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Ảnh bài làm</th>
                  <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Xem trước</th>
                  <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Chuyển ảnh sang chữ</th>
                  <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Đọc chi tiết</th>
                  <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Khớp bản AI</th>
                  <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Chấm điểm</th>
                  <th className="px-3 py-3 font-semibold text-slate-700 whitespace-nowrap">Xem kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((st) => {
                  const sub = submissionForStudent(submissions, exam.id, st.id)
                  const nImg = sub?.imageFiles.length ?? 0
                  const hasPages = (sub?.ocrPages.length ?? 0) > 0
                  const aiMatchPct = sub && hasPages ? submissionAiMatchPercent(sub.ocrPages) : null
                  const hasGraded = !!sub?.gradingResult
                  const converting = convertBusy === st.id
                  const grading = gradeBusy === st.id
                  const picking = loadingPick === st.id

                  return (
                    <tr key={st.id} className="align-top hover:bg-slate-50/80">
                      <td className="px-3 py-3 font-mono text-xs text-slate-700">{st.studentCode?.trim() || '—'}</td>
                      <td className="px-3 py-3 font-medium text-slate-900">{st.name}</td>
                      <td className="px-3 py-3">
                        <input
                          ref={(el) => {
                            fileInputsRef.current[st.id] = el
                          }}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            void onPickImages(st.id, e.target.files)
                            e.target.value = ''
                          }}
                        />
                        <button
                          type="button"
                          disabled={!!picking}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                          onClick={() => fileInputsRef.current[st.id]?.click()}
                        >
                          {picking ? 'Đang đọc…' : 'Chọn ảnh'}
                        </button>
                        {nImg > 0 && (
                          <div className="text-xs text-slate-600 mt-1">
                            Đã chọn <strong>{nImg}</strong> ảnh
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {nImg === 0 || !sub ? (
                          <span className="text-slate-400 text-xs">—</span>
                        ) : (
                          <div className="flex gap-1 flex-wrap max-w-[140px]">
                            {sub.imageFiles.slice(0, 3).map((img) => (
                              <img
                                key={img.id}
                                src={img.dataUrl}
                                alt=""
                                className="w-11 h-11 object-cover rounded border border-slate-100 bg-white"
                              />
                            ))}
                            {nImg > 3 && (
                              <span className="text-xs text-slate-500 self-center">+{nImg - 3}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          disabled={nImg === 0 || converting || grading}
                          className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-700 disabled:opacity-40 whitespace-nowrap"
                          onClick={() => requestConvertToText(st.id)}
                        >
                          {converting ? 'Đang chuyển…' : 'Chuyển ảnh sang chữ'}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        {sub?.id ? (
                          <button
                            type="button"
                            disabled={!hasPages || converting || grading}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-white disabled:opacity-40 whitespace-nowrap"
                            onClick={() => navigate(`/submissions/${sub.id}/sua-bai`)}
                          >
                            Đọc chi tiết
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-700 tabular-nums">
                        {hasPages && aiMatchPct != null ? (
                          <span title="Ước lượng độ giữ nguyên so với chữ AI nhận lần cuối (sau khi bạn chỉnh tay).">
                            {aiMatchPct}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {sub?.id ? (
                          <button
                            type="button"
                            disabled={!hasPages || grading || converting}
                            className="rounded-lg bg-slate-800 text-white px-3 py-1.5 text-xs font-medium hover:bg-slate-900 disabled:opacity-40 whitespace-nowrap"
                            onClick={() => void onGrade(st.id)}
                          >
                            {grading ? 'Đang chấm…' : 'Chấm điểm'}
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {sub?.id ? (
                          <button
                            type="button"
                            disabled={!hasGraded}
                            className="rounded-lg border border-emerald-200 text-emerald-800 px-3 py-1.5 text-xs font-medium hover:bg-emerald-50 disabled:opacity-40 whitespace-nowrap"
                            onClick={() => navigate(`/submissions/${sub.id}/review`)}
                          >
                            Xem kết quả
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {convertWarn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="convert-warn-title"
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-100"
          >
            <h3 id="convert-warn-title" className="font-semibold text-slate-900 text-lg">
              Chuyển lại ảnh sang chữ?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Bạn đã chỉnh chữ khác so với bản AI nhận trước đó. Chạy lại sẽ <strong>ghi đè toàn bộ</strong> chữ đã sửa bằng kết quả mới từ ảnh.
            </p>
            <label className="flex gap-3 items-start text-sm text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-1 rounded border-slate-300"
                checked={convertAck}
                onChange={(e) => setConvertAck(e.target.checked)}
              />
              <span>Tôi đã đọc kỹ và đồng ý để AI nhận lại chữ (mất phần đã chỉnh tay).</span>
            </label>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                onClick={() => {
                  setConvertWarn(null)
                  setConvertAck(false)
                }}
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={!convertAck}
                className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-40"
                onClick={() => void confirmOverwriteConvert()}
              >
                Chuyển lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

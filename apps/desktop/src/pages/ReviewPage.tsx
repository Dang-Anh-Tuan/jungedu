import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppStore } from '../state/appStore'
import type { GradingResult } from '../types'

function mistakeTypeVi(t: string) {
  const map: Record<string, string> = {
    spelling: 'Chính tả',
    repeat: 'Lặp ý',
    grammar: 'Ngữ pháp',
    missing_idea: 'Thiếu ý',
    structure: 'Bố cục',
    other: 'Khác'
  }
  return map[t] ?? t.replaceAll('_', ' ')
}

function downloadText(filename: string, text: string, mime = 'application/json') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function ReviewPage() {
  const navigate = useNavigate()
  const { submissionId } = useParams()

  const submissions = useAppStore((s) => s.submissions)
  const setGradingResult = useAppStore((s) => s.setGradingResult)

  const submission = submissions.find((s) => s.id === submissionId)
  const initial = submission?.gradingResult

  const combinedCorrectedText = useMemo(() => {
    if (!submission) return ''
    return submission.ocrPages.map((p) => p.correctedText).join('\n')
  }, [submission])

  const [score, setScore] = useState<number>(initial?.score ?? 8)
  const [teacherComment, setTeacherComment] = useState<string>(initial?.teacherComment ?? '')
  const [localResult, setLocalResult] = useState<GradingResult | undefined>(initial)

  if (!submission) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-lg font-semibold text-slate-900">Không tìm thấy bài làm</div>
      </div>
    )
  }

  if (!initial) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
        <div className="text-lg font-semibold text-slate-900">Chưa có kết quả AI</div>
        <p className="text-sm text-slate-600">Quay lại bước chấm và chạy AI trước.</p>
        <button
          type="button"
          className="rounded-xl bg-emerald-600 text-white px-5 py-2 text-sm font-medium"
          onClick={() => navigate(`/submissions/${submission.id}/grading`)}
        >
          Đến màn chấm AI
        </button>
      </div>
    )
  }

  const onSaveFinal = () => {
    const updated: GradingResult = {
      ...(localResult ?? initial),
      score,
      teacherComment
    }
    setGradingResult(submission.id, updated)
    setLocalResult(updated)
    toast.success('Đã lưu kết quả cuối.')
  }

  const onExportJson = () => {
    const finalResult = localResult ?? initial
    const payload = {
      submissionId: submission.id,
      examId: submission.examId,
      studentId: submission.studentId,
      studentName: submission.studentName,
      finalEssayText: combinedCorrectedText,
      grading: finalResult
    }
    downloadText(`cham_${submission.studentName}_${submission.id}.json`, JSON.stringify(payload, null, 2))
    toast.success('Đã xuất file JSON.')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Duyệt kết quả</h1>
          <p className="text-sm text-slate-600 mt-1">
            Chỉnh điểm và nhận xét cuối · học sinh: <strong>{submission.studentName}</strong>
          </p>
        </div>
        <button type="button" className="text-sm text-slate-600 hover:text-slate-900" onClick={() => navigate(-1)}>
          ← Trở lại
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2 space-y-5 shadow-sm">
          <div className="font-semibold text-slate-800">Bài làm (đã chỉnh chữ)</div>
          <textarea
            className="w-full rounded-xl border border-slate-200 p-4 min-h-[320px] font-mono text-sm bg-slate-50/40 read-only:text-slate-800"
            value={combinedCorrectedText}
            readOnly
          />

          <div className="border-t border-slate-100 pt-5">
            <div className="font-semibold text-slate-800 mb-3">Tóm tắt lỗi (từ AI)</div>
            <div className="space-y-3">
              {initial.mistakes.slice(0, 30).map((m, i) => (
                <div key={i} className="rounded-xl border border-slate-100 p-4">
                  <div className="text-sm font-semibold text-slate-800">{mistakeTypeVi(m.type)}</div>
                  <div className="text-sm text-slate-700 mt-1">Đoạn gốc: {m.original}</div>
                  {m.suggestion && <div className="text-sm text-slate-700">Gợi ý: {m.suggestion}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm h-fit">
          <div className="font-semibold text-slate-800">Điểm & nhận xét cuối</div>

          <label className="block text-sm">
            <span className="text-slate-600">Điểm (thang 10)</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              type="number"
              step="0.5"
              min={0}
              max={10}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-600">Nhận xét giáo viên</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 min-h-[160px]"
              value={teacherComment}
              onChange={(e) => setTeacherComment(e.target.value)}
            />
          </label>

          <button type="button" className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium hover:bg-slate-50" onClick={onSaveFinal}>
            Lưu kết quả cuối
          </button>

          <button type="button" className="w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-medium hover:bg-slate-800" onClick={onExportJson}>
            Xuất file JSON
          </button>
        </div>
      </div>
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppStore } from '../state/appStore'
import { runAiGrade } from '../services/aiClient'

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

export default function GradingPage() {
  const navigate = useNavigate()
  const { submissionId } = useParams()

  const submissions = useAppStore((s) => s.submissions)
  const exams = useAppStore((s) => s.exams)
  const students = useAppStore((s) => s.students)
  const setGradingResult = useAppStore((s) => s.setGradingResult)

  const submission = submissions.find((s) => s.id === submissionId)
  const exam = useMemo(() => {
    if (!submission) return undefined
    return exams.find((e) => e.id === submission.examId)
  }, [submission, exams])
  const student = useMemo(() => {
    if (!submission) return undefined
    return students.find((st) => st.id === submission.studentId)
  }, [submission, students])

  const combinedText = useMemo(() => {
    if (!submission) return ''
    return submission.ocrPages
      .map((p) => p.correctedText)
      .join('\n')
      .trim()
  }, [submission])

  const [running, setRunning] = useState(false)

  async function onRunGrade() {
    if (!submission || !exam || !student) return
    setRunning(true)
    try {
      const result = await runAiGrade({
        ocrText: combinedText,
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

      setGradingResult(submission.id, result)
      toast.success('Đã có kết quả chấm AI.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  if (!submission) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-lg font-semibold text-slate-900">Không tìm thấy bài làm</div>
      </div>
    )
  }

  const grading = submission.gradingResult

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Chấm bằng AI</h1>
          <p className="text-sm text-slate-600 mt-1">
            Dựa trên chữ đã đối chiếu · học sinh: <strong>{submission.studentName}</strong>
          </p>
        </div>
        <button type="button" className="text-sm text-slate-600 hover:text-slate-900" onClick={() => navigate(-1)}>
          ← Trở lại
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-xl bg-emerald-600 text-white px-5 py-2 text-sm font-medium disabled:opacity-40 hover:bg-emerald-700"
          disabled={running || !combinedText.trim()}
          onClick={onRunGrade}
        >
          {running ? 'Đang chấm…' : grading ? 'Chấm lại (ghi đè)' : 'Chạy chấm AI'}
        </button>
      </div>

      {!grading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Chưa có kết quả. Bấm «Chạy chấm AI» để nhận điểm gợi ý và nhận xét.
        </div>
      )}

      {grading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2 space-y-5 shadow-sm">
            <div className="text-2xl font-semibold text-slate-900">Điểm gợi ý: {grading.score.toFixed(1)}/10</div>
            <p className="text-sm text-slate-500">
              Tổng rubric AI:{' '}
              {grading.rubric.content +
                grading.rubric.grammar +
                grading.rubric.creativity +
                grading.rubric.presentation}{' '}
              (theo trọng số đã nhập — chỉ mang tính tham khảo)
            </p>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="font-semibold text-slate-800">Điểm mạnh</div>
              {grading.strengths.length === 0 ? (
                <div className="text-sm text-slate-500">Không có điểm mạnh nổi bật.</div>
              ) : (
                <ul className="list-disc ml-5 text-sm text-slate-700 space-y-1">
                  {grading.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="font-semibold text-slate-800">Lỗi / cần lưu ý</div>
              {grading.mistakes.length === 0 ? (
                <div className="text-sm text-slate-500">Không phát hiện lỗi cụ thể.</div>
              ) : (
                <div className="space-y-3">
                  {grading.mistakes.slice(0, 20).map((m, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-100 p-4 bg-slate-50/50">
                      <div className="text-sm font-semibold text-slate-800">{mistakeTypeVi(m.type)}</div>
                      <div className="text-sm text-slate-700 mt-1">Đoạn gốc: {m.original}</div>
                      {m.suggestion && <div className="text-sm text-slate-700">Gợi ý: {m.suggestion}</div>}
                      {m.explanation && <div className="text-sm text-slate-500 mt-2">{m.explanation}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="font-semibold text-slate-800">Gợi ý viết lại</div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{grading.rewriteSuggestion || '(Không có)'}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm h-fit">
            <div className="font-semibold text-slate-800">Nhận xét (AI)</div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">{grading.teacherComment || '(Không có)'}</div>

            <div className="border-t border-slate-100 pt-4">
              <div className="text-sm text-slate-500 mb-2">Chi tiết rubric</div>
              <div className="text-sm space-y-1 text-slate-700">
                <div>Nội dung: {grading.rubric.content}</div>
                <div>Ngữ pháp: {grading.rubric.grammar}</div>
                <div>Sáng tạo: {grading.rubric.creativity}</div>
                <div>Trình bày: {grading.rubric.presentation}</div>
              </div>
            </div>

            <button
              type="button"
              className="w-full rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-medium hover:bg-slate-800 disabled:opacity-40"
              disabled={!grading}
              onClick={() => navigate(`/submissions/${submission.id}/review`)}
            >
              Giáo viên duyệt & chỉnh sửa
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

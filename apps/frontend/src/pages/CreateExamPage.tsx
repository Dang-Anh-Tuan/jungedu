import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppStore } from '../state/appStore'
import type { ExamRubric } from '../types'

const teacherStyleOptions = ['encouraging', 'neutral', 'strict'] as const

const styleLabel: Record<(typeof teacherStyleOptions)[number], string> = {
  encouraging: 'Nhẹ nhàng, động viên',
  neutral: 'Trung lập',
  strict: 'Nghiêm khắc hơn'
}

export default function CreateExamPage() {
  const navigate = useNavigate()
  const classes = useAppStore((s) => s.classes)
  const createExam = useAppStore((s) => s.createExam)

  const [classId, setClassId] = useState('')
  const [title, setTitle] = useState('Tả cây mít')
  const [subject, setSubject] = useState('Tập làm văn')
  const [grade, setGrade] = useState(4)
  const [requirements, setRequirements] = useState(
    'Viết đúng chủ đề, có đủ mở bài/thân bài/kết bài. Hạn chế lỗi chính tả.'
  )
  const [teacherStyle, setTeacherStyle] = useState<(typeof teacherStyleOptions)[number]>('encouraging')

  const [rubric, setRubric] = useState<ExamRubric>({
    content: 4,
    grammar: 2,
    creativity: 2,
    presentation: 2
  })

  const [saving, setSaving] = useState(false)

  const totalRubric = useMemo(
    () => rubric.content + rubric.grammar + rubric.creativity + rubric.presentation,
    [rubric]
  )

  const selectedClass = classes.find((c) => c.id === classId)

  async function onCreateExam() {
    if (!classId || classes.length === 0 || saving) return
    setSaving(true)
    try {
      const examId = await createExam({
        classId,
        title: title.trim(),
        subject: subject.trim(),
        grade: Number(grade),
        requirements: requirements.trim(),
        rubric,
        teacherStyle
      })
      toast.success('Đã tạo bài kiểm tra.')
      navigate(`/exams/${examId}/submissions/new`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không tạo được bài kiểm tra.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tạo bài kiểm tra</h1>
          <p className="text-sm text-slate-600 mt-1">
            Học sinh lấy từ <strong>lớp đã import Excel</strong> — quản lý tại{' '}
            <Link to="/classes" className="text-emerald-700 font-medium hover:underline">
              Trang Lớp
            </Link>
            .
          </p>
        </div>
        <Link to="/" className="text-sm text-slate-600 hover:text-slate-900">
          ← Trang chủ
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 space-y-2">
          <p className="font-medium">Cần có ít nhất một lớp để tạo bài kiểm tra.</p>
          <p>
            Vào{' '}
            <Link to="/classes" className="text-emerald-800 font-semibold underline">
              Trang Lớp
            </Link>{' '}
            để tạo lớp và import danh sách (Excel).
          </p>
        </div>
      ) : null}

      {classes.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800">Thông tin bài</h2>
          <label className="block text-sm">
            <span className="text-slate-600">Lớp *</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              required
            >
              <option value="" disabled>
                — Chọn lớp —
              </option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.grade != null ? ` · Khối ${c.grade}` : ''}
                </option>
              ))}
            </select>
          </label>
          {selectedClass && (
            <p className="text-xs text-slate-500">
              Bài kiểm tra sẽ chỉ chọn học sinh thuộc lớp <strong>{selectedClass.name}</strong>.
            </p>
          )}
          <label className="block text-sm">
            <span className="text-slate-600">Tên bài</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Môn</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Khối lớp</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              type="number"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Phong cách nhận xét AI</span>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={teacherStyle}
              onChange={(e) => setTeacherStyle(e.target.value as (typeof teacherStyleOptions)[number])}
            >
              {teacherStyleOptions.map((s) => (
                <option key={s} value={s}>
                  {styleLabel[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-800">Yêu cầu & thang điểm (rubric)</h2>
          <label className="block text-sm">
            <span className="text-slate-600">Yêu cầu bài</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 min-h-[120px]"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['content', 'Nội dung'],
                ['grammar', 'Ngữ pháp / diễn đạt'],
                ['creativity', 'Sáng tạo'],
                ['presentation', 'Trình bày']
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="text-slate-600">{label}</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  type="number"
                  value={rubric[key]}
                  onChange={(e) => setRubric((r) => ({ ...r, [key]: Number(e.target.value) }))}
                />
              </label>
            ))}
          </div>
          <p className="text-sm text-slate-500">Tổng trọng số rubric: {totalRubric}</p>
        </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-xl bg-emerald-600 text-white px-6 py-2.5 font-medium shadow-sm hover:bg-emerald-700 disabled:opacity-40"
              onClick={() => void onCreateExam()}
              disabled={!title.trim() || !classId || saving}
            >
              {saving ? 'Đang lưu…' : 'Tạo bài & nhập bài làm'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

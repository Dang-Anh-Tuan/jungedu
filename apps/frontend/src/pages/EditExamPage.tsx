import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  createRubricCriterionId,
  totalRubricWeight,
  type RubricCriterion
} from '../lib/rubric'
import { useAppStore } from '../state/appStore'

const teacherStyleOptions = ['encouraging', 'neutral', 'strict'] as const

const styleLabel: Record<(typeof teacherStyleOptions)[number], string> = {
  encouraging: 'Nhẹ nhàng, động viên',
  neutral: 'Trung lập',
  strict: 'Nghiêm khắc hơn'
}

export default function EditExamPage() {
  const navigate = useNavigate()
  const { examId } = useParams()
  const classes = useAppStore((s) => s.classes)
  const exams = useAppStore((s) => s.exams)
  const updateExam = useAppStore((s) => s.updateExam)

  const exam = exams.find((e) => e.id === examId)

  const [classId, setClassId] = useState('')
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState(4)
  const [requirements, setRequirements] = useState('')
  const [teacherStyle, setTeacherStyle] = useState<(typeof teacherStyleOptions)[number]>('encouraging')
  const [rubric, setRubric] = useState<RubricCriterion[]>([])

  useEffect(() => {
    if (!exam) return
    setClassId(exam.classId)
    setTitle(exam.title)
    setSubject(exam.subject)
    setGrade(exam.grade)
    setRequirements(exam.requirements)
    setTeacherStyle(exam.teacherStyle)
    setRubric(exam.rubric.map((c) => ({ ...c })))
  }, [exam])

  const totalRubric = useMemo(() => totalRubricWeight(rubric), [rubric])

  const selectedClass = classes.find((c) => c.id === classId)
  const canSave =
    !!exam &&
    !!classId &&
    classes.some((c) => c.id === classId) &&
    !!title.trim() &&
    classes.length > 0 &&
    rubric.some((c) => c.label.trim().length > 0)

  function addCriterion() {
    setRubric((r) => [...r, { id: createRubricCriterionId(), label: 'Tiêu chí mới', weight: 1 }])
  }

  function removeCriterion(id: string) {
    setRubric((r) => (r.length <= 1 ? r : r.filter((c) => c.id !== id)))
  }

  function updateCriterion(id: string, patch: Partial<RubricCriterion>) {
    setRubric((r) => r.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function onSave() {
    if (!examId || !canSave) return
    const cleaned = rubric
      .map((c) => ({
        ...c,
        label: c.label.trim(),
        weight: Number.isFinite(c.weight) ? Math.max(0, c.weight) : 0
      }))
      .filter((c) => c.label.length > 0)
    if (cleaned.length === 0) {
      toast.error('Cần ít nhất một tiêu chí rubric có tên.')
      return
    }
    updateExam(examId, {
      classId,
      title: title.trim(),
      subject: subject.trim(),
      grade: Number(grade),
      requirements: requirements.trim(),
      rubric: cleaned,
      teacherStyle
    })
    toast.success('Đã lưu thay đổi.')
    navigate('/')
  }

  if (!examId || !exam) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
        <p className="font-medium text-slate-900">Không tìm thấy bài kiểm tra.</p>
        <Link to="/" className="text-emerald-700 text-sm">
          ← Trang chủ
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Sửa bài kiểm tra</h1>
          <p className="text-sm text-slate-600 mt-1">
            Chỉnh yêu cầu / rubric / lớp.{' '}
            <Link to="/classes" className="text-emerald-700 font-medium hover:underline">
              Trang Lớp
            </Link>
          </p>
        </div>
        <button type="button" className="text-sm text-slate-600 hover:text-slate-900" onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Chưa có lớp nào —{' '}
          <Link to="/classes" className="font-semibold underline">
            tạo lớp và import học sinh
          </Link>{' '}
          trước khi gán bài kiểm tra.
        </div>
      ) : null}

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
              Chỉ học sinh lớp <strong>{selectedClass.name}</strong> mới được chọn khi nhập bài.
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
          <h2 className="font-semibold text-slate-800">Yêu cầu & rubric</h2>
          <label className="block text-sm">
            <span className="text-slate-600">Yêu cầu bài</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 min-h-[120px]"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Đầu mục & trọng số</span>
              <button
                type="button"
                onClick={addCriterion}
                className="text-sm text-emerald-700 font-medium hover:underline"
              >
                + Thêm tiêu chí
              </button>
            </div>
            <ul className="space-y-2">
              {rubric.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2"
                >
                  <label className="block text-sm flex-1 min-w-[140px]">
                    <span className="text-xs text-slate-500">Tên tiêu chí</span>
                    <input
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                      value={c.label}
                      onChange={(e) => updateCriterion(c.id, { label: e.target.value })}
                    />
                  </label>
                  <label className="block text-sm w-24">
                    <span className="text-xs text-slate-500">Trọng số</span>
                    <input
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                      type="number"
                      min={0}
                      step={0.5}
                      value={c.weight}
                      onChange={(e) => updateCriterion(c.id, { weight: Number(e.target.value) })}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={rubric.length <= 1}
                    onClick={() => removeCriterion(c.id)}
                    className="text-xs text-red-600 hover:text-red-700 disabled:opacity-30 px-2 py-2"
                  >
                    Xóa
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-slate-500">Tổng trọng số rubric: {totalRubric}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-6 py-2.5 font-medium hover:bg-slate-50"
          onClick={() => navigate('/')}
        >
          Huỷ
        </button>
        <button
          type="button"
          className="rounded-xl bg-emerald-600 text-white px-6 py-2.5 font-medium shadow-sm hover:bg-emerald-700 disabled:opacity-40"
          onClick={onSave}
          disabled={!canSave}
        >
          Lưu thay đổi
        </button>
      </div>
    </div>
  )
}

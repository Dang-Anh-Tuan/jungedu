import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppStore } from '../state/appStore'
import { parseExcelToStudentRows } from '../lib/excel'

export default function ClassesPage() {
  const classes = useAppStore((s) => s.classes)
  const students = useAppStore((s) => s.students)
  const createClass = useAppStore((s) => s.createClass)
  const deleteClass = useAppStore((s) => s.deleteClass)
  const importStudentsForClass = useAppStore((s) => s.importStudentsForClass)

  const [selectedId, setSelectedId] = useState('')
  const [newClassName, setNewClassName] = useState('')
  const [newGrade, setNewGrade] = useState<number | ''>('')
  const [busy, setBusy] = useState(false)

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importConfirmChecked, setImportConfirmChecked] = useState(false)
  const [modalPickLabel, setModalPickLabel] = useState('')
  const modalFileRef = useRef<HTMLInputElement>(null)

  const createFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (classes.length === 0) {
      setSelectedId('')
      return
    }
    if (!classes.some((c) => c.id === selectedId)) {
      setSelectedId(classes[0].id)
    }
  }, [classes, selectedId])

  useEffect(() => {
    setImportModalOpen(false)
    setImportConfirmChecked(false)
    setModalPickLabel('')
    if (modalFileRef.current) modalFileRef.current.value = ''
  }, [selectedId])

  const selected = classes.find((c) => c.id === selectedId)
  const roster = useMemo(() => students.filter((s) => s.classId === selectedId), [students, selectedId])

  function closeImportModal() {
    setImportModalOpen(false)
    setImportConfirmChecked(false)
    setModalPickLabel('')
    if (modalFileRef.current) modalFileRef.current.value = ''
  }

  function openImportModal() {
    setImportConfirmChecked(false)
    setModalPickLabel('')
    if (modalFileRef.current) modalFileRef.current.value = ''
    setImportModalOpen(true)
  }

  async function importExcelForClass(classId: string, file: File | null): Promise<boolean> {
    if (!file) return false
    const buf = await file.arrayBuffer()
    const rows = parseExcelToStudentRows(buf)
    if (rows.length === 0) {
      toast.error(
        'Không đọc được dòng nào. Kiểm tra sheet đầu: dòng 1 là tiêu đề cột, có ít nhất cột «Họ và tên» (hoặc «Họ tên»).'
      )
      return false
    }
    importStudentsForClass(classId, rows)
    toast.success(`Đã cập nhật danh sách: ${rows.length} học sinh (thay toàn bộ).`)
    return true
  }

  async function onCreateClassAndMaybeImport(e: React.FormEvent) {
    e.preventDefault()
    const name = newClassName.trim()
    if (!name) return
    setBusy(true)
    try {
      const id = await createClass({
        name,
        grade: newGrade === '' ? undefined : Number(newGrade)
      })
      setSelectedId(id)
      setNewClassName('')
      setNewGrade('')

      const file = createFileRef.current?.files?.[0] ?? null
      if (createFileRef.current) createFileRef.current.value = ''

      if (file) {
        await importExcelForClass(id, file)
      } else {
        toast.success('Đã tạo lớp. Bạn có thể nhập Excel ở chi tiết lớp — nút «Cập nhật danh sách».')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra.')
    } finally {
      setBusy(false)
    }
  }

  async function onConfirmModalImport() {
    const file = modalFileRef.current?.files?.[0] ?? null
    if (!file || !selectedId || !importConfirmChecked) return
    setBusy(true)
    try {
      const ok = await importExcelForClass(selectedId, file)
      if (ok) closeImportModal()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi đọc file Excel.')
    } finally {
      setBusy(false)
    }
  }

  function onDeleteSelected() {
    if (!selected) return
    if (confirm('Xoá lớp này? Học sinh và bài kiểm tra thuộc lớp sẽ bị xoá theo.')) {
      const rest = classes.filter((c) => c.id !== selected.id)
      deleteClass(selected.id)
      setSelectedId(rest[0]?.id ?? '')
      toast.success('Đã xóa lớp.')
    }
  }

  const formCreate = (
    <form onSubmit={onCreateClassAndMaybeImport} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <h2 className="font-semibold text-slate-800">Thêm lớp</h2>
      <p className="text-xs text-slate-600">
        Điền tên lớp và có thể chọn file Excel ngay — danh sách sẽ được nhập sau khi lớp được tạo.
      </p>
      <label className="block text-sm">
        <span className="text-slate-600">Tên lớp *</span>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          placeholder="Ví dụ: 4A1"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-600">Khối (tuỳ chọn)</span>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          type="number"
          value={newGrade}
          onChange={(e) => setNewGrade(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="4"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-600">Danh sách học sinh (.xlsx, .xls, .csv) — tuỳ chọn</span>
        <input ref={createFileRef} type="file" accept=".xlsx,.xls,.csv" disabled={busy} className="mt-1 block w-full text-sm" />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-slate-900 text-white py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {busy ? 'Đang xử lý…' : 'Thêm lớp và nhập danh sách'}
      </button>
    </form>
  )

  const classList =
    classes.length > 0 ? (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-3">Danh sách lớp</h2>
        <ul className="space-y-1 max-h-72 overflow-auto">
          {classes.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                  c.id === selectedId ? 'bg-emerald-50 text-emerald-900 font-medium' : 'hover:bg-slate-50'
                }`}
                onClick={() => setSelectedId(c.id)}
              >
                {c.name}
                {c.grade != null ? ` · Khối ${c.grade}` : ''}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null

  const excelGuide = (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-sm text-slate-700">
      <div className="font-semibold text-slate-900">Định dạng file Excel (sheet đầu tiên)</div>
      <ul className="list-disc ml-5 space-y-2">
        <li>
          <strong>Dòng 1</strong>: tiêu đề cột (khuyến nghị). <strong>Dòng 2 trở đi</strong>: mỗi dòng một học sinh.
        </li>
        <li>
          <strong className="text-slate-900">Họ và tên</strong> —{' '}
          <span className="text-emerald-800 font-medium">bắt buộc</span> – nhận diện tiêu đề kiểu «Họ và tên», «Họ tên», «Name»…
        </li>
        <li>
          <strong className="text-slate-900">Mã học sinh</strong> —{' '}
          <span className="text-slate-600">tuỳ chọn</span> («Mã HS», «Mã học sinh», «Code»…) – dùng khi ghép ảnh nhiều học sinh (
          <code className="text-xs bg-white px-1 rounded border border-slate-200">HS01_1.jpg</code>).
        </li>
        <li>
          <strong className="text-slate-900">Học lực</strong> —{' '}
          <span className="text-slate-600">tuỳ chọn</span> («Học lực», «XL», «Xếp loại»…) – gửi kèm AI khi chấm.
        </li>
        <li>
          <strong className="text-slate-900">Ghi chú</strong> —{' '}
          <span className="text-slate-600">tuỳ chọn</span> («Ghi chú», «Chú ý», «Notes»…) – ví dụ học sinh giỏi, kỳ vọng cao hơn.
        </li>
      </ul>
      <p className="text-xs text-slate-500 pt-2 border-t border-slate-200">
        Cột thiếu có thể để trống. Thứ tự cột không bắt buộc miễn là tiêu đề khớp một trong các gợi ý trên.
      </p>
    </div>
  )

  const modalFileChosen = modalPickLabel.length > 0

  const detailPanel = selected ? (
    <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-800">Danh sách · {selected.name}</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
            disabled={busy}
            onClick={openImportModal}
          >
            Cập nhật danh sách
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            onClick={onDeleteSelected}
          >
            Xóa
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-600">
              <th className="px-3 py-2 font-medium whitespace-nowrap">STT</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Mã HS</th>
              <th className="px-3 py-2 font-medium">Họ tên</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Học lực</th>
              <th className="px-3 py-2 font-medium min-w-[140px]">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {roster.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                  Chưa có học sinh — bấm «Cập nhật danh sách» để chọn file Excel.
                </td>
              </tr>
            ) : (
              roster.map((s, i) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 whitespace-nowrap">{i + 1}</td>
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{s.studentCode ?? '—'}</td>
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2 text-slate-700">{s.hocLuc ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600 max-w-[280px]">{s.notes?.trim() ? s.notes : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {importModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeImportModal()
          }}
        >
          <div className="w-full max-w-lg max-h-[min(90vh,720px)] overflow-y-auto rounded-2xl bg-white shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 id="import-modal-title" className="text-lg font-semibold text-slate-900">
                Cập nhật danh sách học sinh
              </h3>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 text-xl leading-none"
                onClick={closeImportModal}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Lớp: <strong>{selected.name}</strong>. Thao tác này <strong>thay toàn bộ</strong> danh sách hiện tại bằng dữ liệu trong file.
            </p>

            {excelGuide}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Chọn file</label>
              <input
                ref={modalFileRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={busy}
                className="text-sm w-full"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  setModalPickLabel(f?.name ?? '')
                  setImportConfirmChecked(false)
                }}
              />
              {modalFileChosen && <p className="text-xs text-slate-600">Đã chọn: {modalPickLabel}</p>}
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-slate-300"
                checked={importConfirmChecked}
                onChange={(e) => setImportConfirmChecked(e.target.checked)}
                disabled={!modalFileChosen || busy}
              />
              <span className="text-sm text-slate-700">
                Tôi đã đọc hướng dẫn định dạng và <strong>xác nhận thay thế toàn bộ</strong> danh sách học sinh của lớp này bằng dữ liệu
                từ file đã chọn.
              </span>
            </label>

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                onClick={closeImportModal}
                disabled={busy}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-40"
                disabled={busy || !modalFileChosen || !importConfirmChecked}
                onClick={onConfirmModalImport}
              >
                {busy ? 'Đang cập nhật…' : 'Xác nhận cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600 shadow-sm">
      Chọn một lớp ở danh sách bên trái để xem danh sách.
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Lớp</h1>
          <p className="text-sm text-slate-600 mt-1">
            Tạo lớp và nhập Excel ngay hoặc cập nhật sau. <strong>Mã HS</strong> dùng khi nhập ảnh theo lớp (
            <code className="text-xs bg-slate-100 px-1 rounded">HS01_1.jpg</code>).
          </p>
        </div>
        <Link
          to="/exams/new"
          className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-emerald-700 transition-colors"
        >
          Tạo bài kiểm tra
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-6 py-10 text-center">
            <p className="text-lg font-semibold text-amber-950">Chưa có dữ liệu lớp học</p>
            <p className="text-sm text-amber-900/90 mt-2 max-w-lg mx-auto">
              Thêm ít nhất một lớp bên dưới. Bạn có thể đính kèm file Excel trong cùng bước để có danh sách học sinh ngay.
            </p>
          </div>
          {excelGuide}
          {formCreate}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            {formCreate}
            {classList}
          </div>
          {detailPanel}
        </div>
      )}
    </div>
  )
}

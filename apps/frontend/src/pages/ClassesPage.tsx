import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAppStore } from '../state/appStore'
import { parseExcelToStudentRows } from '../lib/excel'

const EXCEL_FILENAME_EXAMPLE = 'HS01_1.jpg'

export default function ClassesPage() {
  const { t } = useTranslation()
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
    let parsed: ReturnType<typeof parseExcelToStudentRows>
    try {
      const buf = await file.arrayBuffer()
      parsed = parseExcelToStudentRows(buf)
    } catch {
      toast.error(t('classes.toastExcelReadFail'))
      return false
    }
    const { rows, skippedMissingCodeOrName } = parsed
    if (rows.length === 0) {
      toast.error(t('classes.toastImportEmpty'))
      return false
    }
    await importStudentsForClass(classId, rows)
    const skipHint =
      skippedMissingCodeOrName > 0 ? t('classes.skipHint', { n: skippedMissingCodeOrName }) : ''
    toast.success(t('classes.toastImportOk', { count: rows.length, skipHint }))
    return true
  }

  async function onCreateClassAndMaybeImport(e: React.FormEvent) {
    e.preventDefault()
    const name = newClassName.trim()
    if (!name) return
    /** Giữ File trước mọi await — sau await một số trình duyệt có thể làm mất chọn file trong input. */
    const excelFileEarly = createFileRef.current?.files?.[0] ?? null
    setBusy(true)
    try {
      const id = await createClass({
        name,
        grade: newGrade === '' ? undefined : Number(newGrade)
      })
      setSelectedId(id)
      setNewClassName('')
      setNewGrade('')

      if (createFileRef.current) createFileRef.current.value = ''

      if (excelFileEarly) {
        await importExcelForClass(id, excelFileEarly)
      } else {
        toast.success(t('classes.toastCreateClassOk'))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('classes.toastGenericError'))
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
      toast.error(e instanceof Error ? e.message : t('classes.toastExcelError'))
    } finally {
      setBusy(false)
    }
  }

  function onDeleteSelected() {
    if (!selected) return
    if (confirm(t('classes.confirmDeleteClass'))) {
      const rest = classes.filter((c) => c.id !== selected.id)
      deleteClass(selected.id)
      setSelectedId(rest[0]?.id ?? '')
      toast.success(t('classes.toastDeleteClass'))
    }
  }

  const formCreate = (
    <form onSubmit={onCreateClassAndMaybeImport} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <h2 className="font-semibold text-slate-800">{t('classes.addClass')}</h2>
      <p className="text-xs text-slate-600">{t('classes.formIntro')}</p>
      <label className="block text-sm">
        <span className="text-slate-600">{t('classes.className')}</span>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          placeholder={t('classes.classNamePlaceholder')}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-600">{t('classes.gradeOptional')}</span>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          type="number"
          value={newGrade}
          onChange={(e) => setNewGrade(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="4"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-600">{t('classes.excelOptional')}</span>
        <input ref={createFileRef} type="file" accept=".xlsx,.xls,.csv" disabled={busy} className="mt-1 block w-full text-sm" />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-slate-900 text-white py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {busy ? t('classes.processing') : t('classes.submitAdd')}
      </button>
    </form>
  )

  const classList =
    classes.length > 0 ? (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-3">{t('classes.classList')}</h2>
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
                {c.grade != null ? t('classes.gradeSuffix', { grade: c.grade }) : ''}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null

  const excelGuide = (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-sm text-slate-700">
      <div className="font-semibold text-slate-900">{t('classes.excelHeader')}</div>
      <ul className="list-disc ml-5 space-y-2">
        {(['excelLi1', 'excelLi2', 'excelLi3', 'excelLi4', 'excelLi5'] as const).map((key) => (
          <li
            key={key}
            // Chuỗi đến từ file dịch nội bộ (tin cậy)
            dangerouslySetInnerHTML={{
              __html: t(`classes.${key}`, { fileExample: EXCEL_FILENAME_EXAMPLE })
            }}
          />
        ))}
      </ul>
      <p className="text-xs text-slate-500 pt-2 border-t border-slate-200">{t('classes.excelFooter')}</p>
    </div>
  )

  const modalFileChosen = modalPickLabel.length > 0

  const detailPanel = selected ? (
    <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-800">{t('classes.rosterTitle', { name: selected.name })}</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
            disabled={busy}
            onClick={openImportModal}
          >
            {t('classes.updateRoster')}
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            onClick={onDeleteSelected}
          >
            {t('classes.deleteClass')}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-600">
              <th className="px-3 py-2 font-medium whitespace-nowrap">{t('classes.stt')}</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">{t('classes.colCode')}</th>
              <th className="px-3 py-2 font-medium">{t('classes.colName')}</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">{t('classes.colRank')}</th>
              <th className="px-3 py-2 font-medium min-w-[140px]">{t('classes.colNotes')}</th>
            </tr>
          </thead>
          <tbody>
            {roster.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                  {t('classes.noStudents')}
                </td>
              </tr>
            ) : (
              roster.map((s, i) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 whitespace-nowrap">{i + 1}</td>
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                    {s.studentCode ?? t('pdf.dash')}
                  </td>
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2 text-slate-700">{s.hocLuc ?? t('pdf.dash')}</td>
                  <td className="px-3 py-2 text-slate-600 max-w-[280px]">
                    {s.notes?.trim() ? s.notes : t('pdf.dash')}
                  </td>
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
                {t('classes.importModalTitle')}
              </h3>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 text-xl leading-none"
                onClick={closeImportModal}
                aria-label={t('classes.close')}
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-600">{t('classes.importModalIntro', { name: selected.name })}</p>

            {excelGuide}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">{t('classes.pickFile')}</label>
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
              {modalFileChosen && (
                <p className="text-xs text-slate-600">{t('classes.chosenFile', { name: modalPickLabel })}</p>
              )}
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-slate-300"
                checked={importConfirmChecked}
                onChange={(e) => setImportConfirmChecked(e.target.checked)}
                disabled={!modalFileChosen || busy}
              />
              <span className="text-sm text-slate-700">{t('classes.confirmReplace')}</span>
            </label>

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                onClick={closeImportModal}
                disabled={busy}
              >
                {t('classes.cancel')}
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-40"
                disabled={busy || !modalFileChosen || !importConfirmChecked}
                onClick={onConfirmModalImport}
              >
                {busy ? t('classes.importing') : t('classes.confirmImport')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600 shadow-sm">
      {t('classes.selectClass')}
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('classes.title')}</h1>
          <p className="text-sm text-slate-600 mt-1">
            {t('classes.subtitle', { example: EXCEL_FILENAME_EXAMPLE })}
          </p>
        </div>
        <Link
          to="/exams/new"
          className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-emerald-700 transition-colors"
        >
          {t('classes.createExamCta')}
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-6 py-10 text-center">
            <p className="text-lg font-semibold text-amber-950">{t('classes.emptyStateTitle')}</p>
            <p className="text-sm text-amber-900/90 mt-2 max-w-lg mx-auto">{t('classes.emptyStateBody')}</p>
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

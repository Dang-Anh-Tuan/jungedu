import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { computeDraftVsAiSegments } from '../lib/draftAiDiff'
import { useAppStore } from '../state/appStore'

export default function OcrConfirmPage() {
  const navigate = useNavigate()
  const { submissionId } = useParams()
  const submissions = useAppStore((s) => s.submissions)

  const submission = submissions.find((s) => s.id === submissionId)

  const [selectedPageIndex, setSelectedPageIndex] = useState(0)
  const ocrPages = submission?.ocrPages ?? []
  const selectedPage = ocrPages[selectedPageIndex]

  const [draftText, setDraftText] = useState('')
  const [showAiCompare, setShowAiCompare] = useState(false)
  const draftRef = useRef('')
  draftRef.current = draftText

  useEffect(() => {
    setDraftText(selectedPage?.correctedText ?? '')
  }, [selectedPageIndex, selectedPage?.id])

  const combinedCorrectedText = useMemo(() => {
    if (!submission) return ''
    if (submission.ocrPages.length === 0) return ''
    return submission.ocrPages.map((p) => p.correctedText).join('\n')
  }, [submission])

  const highlightSegments = useMemo(() => {
    const ai = selectedPage?.ocrText ?? ''
    return computeDraftVsAiSegments(ai, draftText)
  }, [selectedPage?.ocrText, draftText])

  const saveDraftNow = useCallback(
    (pageId?: string, text?: string) => {
      const sid = submissionId
      if (!sid) return
      const sub = useAppStore.getState().submissions.find((s) => s.id === sid)
      const pid = pageId ?? sub?.ocrPages[selectedPageIndex]?.id
      if (!sub || !pid) return
      const body = text ?? draftRef.current
      const page = sub.ocrPages.find((p) => p.id === pid)
      if (!page || body === page.correctedText) return
      useAppStore.getState().setOcrPageCorrectedText(sub.id, pid, body)
    },
    [submissionId, selectedPageIndex]
  )

  useEffect(() => {
    if (!submissionId || !selectedPage) return
    if (draftText === selectedPage.correctedText) return
    const pid = selectedPage.id
    const t = window.setTimeout(() => {
      useAppStore.getState().setOcrPageCorrectedText(submissionId!, pid, draftText)
    }, 450)
    return () => window.clearTimeout(t)
  }, [draftText, submissionId, selectedPage?.id, selectedPage?.correctedText])

  function goToPage(idx: number) {
    saveDraftNow()
    setSelectedPageIndex(idx)
  }

  function confirmBack() {
    saveDraftNow()
    const sub = useAppStore.getState().submissions.find((s) => s.id === submissionId)
    if (sub) navigate(`/exams/${sub.examId}/submissions/new`)
  }

  if (!submission) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-lg font-semibold text-slate-900">Không tìm thấy bài làm</div>
        <Link to="/" className="text-emerald-700 text-sm mt-4 inline-block">
          ← Trang chủ
        </Link>
      </div>
    )
  }

  const backToImport = `/exams/${submission.examId}/submissions/new`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Đối chiếu ảnh và chữ</h1>
          <p className="text-sm text-slate-600 mt-1">
            Học sinh: <strong>{submission.studentName}</strong> · Ảnh giữ đúng thứ tự đã chọn (theo tên file).
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Link to={backToImport} className="text-sm font-medium text-emerald-800 hover:underline py-1">
            ← Về danh sách nhập bài
          </Link>
          <Link to="/" className="text-sm text-slate-600 hover:text-slate-900 py-1">
            Trang chủ
          </Link>
        </div>
      </div>

      {submission.imageFiles.length === 0 ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Chưa có ảnh bài làm.{' '}
          <Link to={backToImport} className="font-medium underline">
            Quay lại để chọn ảnh
          </Link>
          .
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            {submission.ocrPages.length > 0 ? (
              <>
                Đã có chữ cho {submission.ocrPages.length}/{submission.imageFiles.length} trang · chỉnh sửa được lưu tự động nhoaaa~ 🌸
              </>
            ) : (
              <span className="text-amber-800">
                Chưa có chữ — quay về{' '}
                <Link to={backToImport} className="font-medium underline">
                  danh sách nhập bài
                </Link>{' '}
                và bấm «Chuyển ảnh sang chữ».
              </span>
            )}
          </p>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 space-y-3">
                <div className="font-semibold text-slate-800">Ảnh gốc</div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {submission.imageFiles.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      className={`rounded-lg border px-3 py-1 text-xs whitespace-nowrap transition-colors ${
                        idx === selectedPageIndex ? 'bg-emerald-100 border-emerald-300 text-emerald-950' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                      onClick={() => goToPage(idx)}
                    >
                      Trang {idx + 1}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Giữ phím <kbd className="rounded border border-slate-200 bg-slate-50 px-1">Shift</kbd> và cuộn chuột trong khung ảnh để zoom;
                  ảnh sẽ phóng to trong khung cố định nhoaaa~ 🔍
                </p>
                {submission.imageFiles[selectedPageIndex] && (
                  <ShiftWheelZoomImage
                    src={
                      submission.imageFiles[selectedPageIndex].dataUrl ||
                      submission.imageFiles[selectedPageIndex].objectUrl
                    }
                    alt={submission.imageFiles[selectedPageIndex].name}
                  />
                )}
              </div>

              <div className="lg:col-span-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-semibold text-slate-800">Chữ đọc được (sửa tay — tự lưu)</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedPage ? (
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showAiCompare}
                          onChange={(e) => setShowAiCompare(e.target.checked)}
                          className="sr-only peer"
                        />
                        <span
                          className="relative inline-block h-5 w-10 rounded-full bg-slate-300 transition-colors duration-200
                          peer-checked:bg-emerald-500"
                        >
                          <span
                            className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200
                            peer-checked:translate-x-5"
                          />
                        </span>
                        <span className="text-[11px] font-medium text-slate-700">
                          {showAiCompare ? 'Đang so sánh với AI' : 'Đang sửa bản đối chiếu'}
                        </span>
                      </label>
                    ) : null}
                    <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1">
                      ✨ Khi bé nhập nội dung sẽ tự lưu nhoaaaa
                    </p>
                  </div>
                </div>

                {selectedPage && showAiCompare ? (
                  <div className="rounded-xl border border-red-100 bg-red-50/40 p-3 space-y-2 min-h-[320px]">
                    <div className="text-xs font-semibold text-red-900">
                      Đối chiếu với chữ AI —{' '}
                      <span className="font-normal text-red-800">đoạn nền đỏ là phần khác bản AI đọc được</span>
                    </div>
                    <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-800 max-h-[240px] overflow-y-auto rounded-lg bg-white/80 border border-red-100 p-3">
                      {highlightSegments.length === 0 ? (
                        <span className="text-slate-400">(Trống)</span>
                      ) : (
                        highlightSegments.map((s, idx) =>
                          s.kind === 'diff' ? (
                            <mark key={idx} className="bg-red-200 text-red-950 rounded-sm px-0.5">
                              {s.text}
                            </mark>
                          ) : (
                            <span key={idx}>{s.text}</span>
                          )
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <textarea
                    className="w-full rounded-xl border border-slate-200 p-3 min-h-[320px] font-mono text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onBlur={() => saveDraftNow()}
                    placeholder={
                      submission.ocrPages.length === 0
                        ? 'Chưa có chữ — quay danh sách và bấm «Chuyển ảnh sang chữ» trước.'
                        : ''
                    }
                    disabled={!selectedPage}
                  />
                )}

                <div className="flex flex-wrap justify-end gap-3 items-center">
                  <button
                    type="button"
                    className="rounded-xl bg-emerald-600 text-white px-5 py-2 text-sm font-medium disabled:opacity-40 hover:bg-emerald-700"
                    disabled={!combinedCorrectedText.trim()}
                    onClick={confirmBack}
                  >
                    Xác nhận và quay lại danh sách
                  </button>
                </div>

                <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  Dùng nút «Chấm điểm» trên dòng học sinh ở trang nhập bài để chạy AI; «Xem kết quả» khi đã chấm xong.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ShiftWheelZoomImage({ src, alt }: { src: string; alt: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    setZoom(1)
  }, [src])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const ox = e.clientX - rect.left
      const oy = e.clientY - rect.top
      const docX = el.scrollLeft + ox
      const docY = el.scrollTop + oy
      const delta = e.deltaY > 0 ? -0.1 : 0.1

      setZoom((z0) => {
        // min zoom is 1 (100%) — no zoom out below original size
        const z1 = Math.min(4, Math.max(1, Math.round((z0 + delta) * 100) / 100))
        const k = z1 / z0
        requestAnimationFrame(() => {
          const node = wrapRef.current
          if (!node) return
          node.scrollLeft = docX * k - ox
          node.scrollTop = docY * k - oy
        })
        return z1
      })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-500 tabular-nums flex items-center gap-2">
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        {zoom > 1 && (
          <button
            type="button"
            className="text-xs text-emerald-600 hover:underline"
            onClick={() => setZoom(1)}
          >
            Reset
          </button>
        )}
      </div>
      {/* Fixed container: width & height stay the same regardless of zoom; overflow hidden so image is clipped inside */}
      <div
        ref={wrapRef}
        className="overflow-auto rounded-xl border border-slate-100 bg-slate-50"
        style={{ width: '100%', maxHeight: 'min(70vh, 560px)', height: 'min(70vh, 560px)' }}
      >
        <img
          className="block rounded-lg bg-white shadow-sm select-none"
          style={{ width: `${zoom * 100}%`, height: 'auto', maxWidth: 'none', minWidth: '100%' }}
          src={src}
          alt={alt}
          draggable={false}
        />
      </div>
    </div>
  )
}

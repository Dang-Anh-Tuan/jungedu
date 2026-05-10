import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { computeDraftVsAiSegments } from '../lib/draftAiDiff'
import { useAppStore } from '../state/appStore'
import { TIMING } from '../config/constants'

export default function OcrConfirmPage() {
  const { t } = useTranslation()
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
    }, TIMING.OCR_DRAFT_SAVE_MS)
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
        <div className="text-lg font-semibold text-slate-900">{t('ocr.notFound')}</div>
        <Link to="/" className="text-emerald-700 text-sm mt-4 inline-block">
          {t('ocr.backHome')}
        </Link>
      </div>
    )
  }

  const backToImport = `/exams/${submission.examId}/submissions/new`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('ocr.title')}</h1>
          <p className="text-sm text-slate-600 mt-1">
            {t('ocr.subtitle', { name: submission.studentName })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Link to={backToImport} className="text-sm font-medium text-emerald-800 hover:underline py-1">
            {t('ocr.backToImport')}
          </Link>
          <Link to="/" className="text-sm text-slate-600 hover:text-slate-900 py-1">
            {t('ocr.navHome')}
          </Link>
        </div>
      </div>

      {submission.imageFiles.length === 0 ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t('ocr.noImagesLead')}{' '}
          <Link to={backToImport} className="font-medium underline">
            {t('ocr.noImagesPickAgain')}
          </Link>
          .
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            {submission.ocrPages.length > 0 ? (
              <>
                {t('ocr.progressOk', {
                  current: submission.ocrPages.length,
                  total: submission.imageFiles.length
                })}
              </>
            ) : (
              <span className="text-amber-800">
                {t('ocr.noTextPrefix')}{' '}
                <Link to={backToImport} className="font-medium underline">
                  {t('ocr.noTextLink')}
                </Link>{' '}
                {t('ocr.noTextSuffix')}
              </span>
            )}
          </p>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 space-y-3">
                <div className="font-semibold text-slate-800">{t('ocr.originalImage')}</div>
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
                      {t('ocr.pageLabel', { n: idx + 1 })}
                    </button>
                  ))}
                </div>
                <p
                  className="text-xs text-slate-500"
                  dangerouslySetInnerHTML={{ __html: t('ocr.zoomHint') }}
                />
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
                  <div className="font-semibold text-slate-800">{t('ocr.correctedHeading')}</div>
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
                          {showAiCompare ? t('ocr.modeCompareAi') : t('ocr.modeEdit')}
                        </span>
                      </label>
                    ) : null}
                    <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1">
                      {t('ocr.autosaveBadge')}
                    </p>
                  </div>
                </div>

                {selectedPage && showAiCompare ? (
                  <div className="rounded-xl border border-red-100 bg-red-50/40 p-3 space-y-2 min-h-[320px]">
                    <div className="text-xs font-semibold text-red-900">
                      {t('ocr.diffHeading')}{' '}
                      <span className="font-normal text-red-800">{t('ocr.diffHint')}</span>
                    </div>
                    <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-800 max-h-[240px] overflow-y-auto rounded-lg bg-white/80 border border-red-100 p-3">
                      {highlightSegments.length === 0 ? (
                        <span className="text-slate-400">{t('ocr.emptyParen')}</span>
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
                      submission.ocrPages.length === 0 ? t('ocr.textareaPlaceholder') : ''
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
                    {t('ocr.confirmBack')}
                  </button>
                </div>

                <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  {t('ocr.footerHint')}
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
  const { t } = useTranslation()
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
        <span>
          {t('ocr.zoomLabel')} {Math.round(zoom * 100)}%
        </span>
        {zoom > 1 && (
          <button
            type="button"
            className="text-xs text-emerald-600 hover:underline"
            onClick={() => setZoom(1)}
          >
            {t('ocr.zoomReset')}
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

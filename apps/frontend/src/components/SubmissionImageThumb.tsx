import React, { useEffect, useState } from 'react'
import type { SubmissionImageFile } from '../types'
import { resolveSubmissionImageWorkUrl } from '../services/storage/submissionImagePersistence'

type Props = {
  img: SubmissionImageFile
  className?: string
  alt?: string
}

/** Hiển thị thumbnail — tự load từ IndexedDB khi chỉ có `localKey` trên Firestore. */
export default function SubmissionImageThumb({ img, className = '', alt = '' }: Props) {
  const [src, setSrc] = useState(() => img.dataUrl || img.objectUrl || '')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    let revokeUrl: string | undefined
    let cancelled = false
    ;(async () => {
      const { url, revokeWhenDone } = await resolveSubmissionImageWorkUrl(img)
      if (cancelled) {
        if (revokeWhenDone && url.startsWith('blob:')) URL.revokeObjectURL(url)
        return
      }
      if (!url) setFailed(true)
      else setSrc(url)
      if (revokeWhenDone) revokeUrl = url
    })()
    return () => {
      cancelled = true
      if (revokeUrl?.startsWith('blob:')) URL.revokeObjectURL(revokeUrl)
    }
  }, [img])

  if (failed || !src) {
    return (
      <span
        className={`inline-flex items-center justify-center bg-slate-100 text-slate-400 text-[10px] ${className}`}
      >
        Ảnh
      </span>
    )
  }

  return <img src={src} alt={alt} className={className} />
}

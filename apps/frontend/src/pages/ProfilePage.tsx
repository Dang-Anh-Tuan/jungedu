import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import GoogleDriveConnectBanner from '../components/GoogleDriveConnectBanner'
import { TIMING } from '../config/constants'
import { saveTeacherGradingExperienceToFirestore } from '../platform/persistence'
import { useTeacherGradingExperiencePref } from '../services/appSettings/teacherGradingExperiencePref'

function TeacherGradingExperienceCard() {
  const { t } = useTranslation()
  const synced = useTeacherGradingExperiencePref()
  const [draft, setDraft] = useState(synced)
  const debounceTimer = useRef<number>()

  useEffect(() => {
    setDraft(synced)
  }, [synced])

  const saveQuiet = useCallback(
    async (text: string) => {
      try {
        await saveTeacherGradingExperienceToFirestore(text)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('profile.toastExpFail'))
      }
    },
    [t]
  )

  useEffect(() => {
    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current)
    }
  }, [])

  const scheduleSave = (text: string) => {
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current)
    debounceTimer.current = window.setTimeout(() => {
      void (async () => {
        try {
          await saveTeacherGradingExperienceToFirestore(text)
        } catch (e) {
          toast.error(e instanceof Error ? e.message : t('profile.toastExpFail'))
        }
      })()
    }, TIMING.TEACHER_EXPERIENCE_DEBOUNCE_MS)
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">{t('profile.expTitle')}</h2>
      <p className="text-sm text-slate-600">{t('profile.expHint')}</p>
      <textarea
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 min-h-[140px] resize-y"
        value={draft}
        onChange={(e) => {
          const v = e.target.value
          setDraft(v)
          scheduleSave(v)
        }}
        onBlur={() => void saveQuiet(draft)}
        placeholder={t('profile.expPh')}
      />
      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        <span aria-hidden>✨</span>
        {t('profile.expAutosave')}
      </p>
    </section>
  )
}

export default function ProfilePage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{t('profile.title')}</h1>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">{t('profile.storageTitle')}</h2>
        <p className="text-sm text-slate-600">{t('profile.storageHint')}</p>
        <GoogleDriveConnectBanner compact />
      </section>

      <TeacherGradingExperienceCard />

      <p className="text-sm">
        <Link to="/" className="font-medium text-emerald-800 hover:underline">
          {t('nav.backHome')}
        </Link>
      </p>
    </div>
  )
}

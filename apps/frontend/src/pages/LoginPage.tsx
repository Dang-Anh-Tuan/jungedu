import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { persistGoogleDriveAccessTokenFromCredential } from '../services/googleDrive/oauth'
import { signInWithGooglePopup } from '../platform/auth'

export default function LoginPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const credential = await signInWithGooglePopup()
      persistGoogleDriveAccessTokenFromCredential(credential)
    } catch (e) {
      console.error('Google login failed:', e)
      window.alert(e instanceof Error ? e.message : t('login.alertFail'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">{t('login.title')}</h1>
          <p className="text-sm text-slate-600">{t('login.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {loading ? t('login.loading') : t('login.button')}
        </button>
      </div>
    </div>
  )
}

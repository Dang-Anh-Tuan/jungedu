import React, { useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleAuthProvider } from '../lib/firebase'
import { persistGoogleDriveAccessTokenFromCredential } from '../services/googleDrive/oauth'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const credential = await signInWithPopup(auth, googleAuthProvider)
      persistGoogleDriveAccessTokenFromCredential(credential)
    } catch (e) {
      console.error('Google login failed:', e)
      window.alert(e instanceof Error ? e.message : 'Đăng nhập Google thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Đăng nhập JungEdu</h1>
          <p className="text-sm text-slate-600">
            Dùng Google để tách dữ liệu Firestore theo từng tài khoản, tránh conflict giữa nhiều người dùng.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập với Google'}
        </button>
      </div>
    </div>
  )
}

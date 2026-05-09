import React from 'react'
import { signOut } from 'firebase/auth'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { auth } from '../lib/firebase'
import { useAuthStore } from '../state/authStore'

const nav = [
  { to: '/', label: 'Trang chủ' },
  { to: '/classes', label: 'Lớp' },
  { to: '/exams', label: 'Bài kiểm tra' },
  { to: '/profile', label: 'Cài đặt' }
]

export default function AppLayout() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight text-emerald-900">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-sm">
              JE
            </span>
            JungEdu Assistant
          </Link>
          <nav className="flex flex-wrap gap-1">
            {nav.map((item) => {
              const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                    active ? 'bg-emerald-100 text-emerald-900 font-medium' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            {user?.email ? <span className="text-slate-600">{user.email}</span> : null}
            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        duration={4200}
        toastOptions={{
          classNames: {
            toast:
              'border border-slate-200/90 shadow-lg shadow-slate-900/10 rounded-xl font-sans gap-3 [&_[data-description]]:!opacity-95'
          }
        }}
      />
    </div>
  )
}

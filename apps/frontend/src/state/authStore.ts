import { create } from 'zustand'
import type { User } from 'firebase/auth'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AuthState = {
  status: AuthStatus
  user: User | null
  setAuthLoading: () => void
  setAuthenticated: (user: User) => void
  setUnauthenticated: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  setAuthLoading: () => set({ status: 'loading', user: null }),
  setAuthenticated: (user) => set({ status: 'authenticated', user }),
  setUnauthenticated: () => set({ status: 'unauthenticated', user: null })
}))

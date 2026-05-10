import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { toast } from 'sonner'
import App from './App'
import { auth } from './lib/firebase'
import { subscribeAppSettings, subscribeFirestoreCollections } from './services/firebase'
import { setTeacherGradingExperienceCache } from './services/appSettings/teacherGradingExperiencePref'
import { useAppStore } from './state/appStore'
import { useAuthStore } from './state/authStore'
import './index.css'

let stopDataSync: (() => void) | undefined
let stopSettingsSync: (() => void) | undefined

useAuthStore.getState().setAuthLoading()

onAuthStateChanged(auth, (user) => {
  stopDataSync?.()
  stopDataSync = undefined
  stopSettingsSync?.()
  stopSettingsSync = undefined

  if (!user) {
    useAuthStore.getState().setUnauthenticated()
    useAppStore.getState().resetForLogout()
    setTeacherGradingExperienceCache('')
    return
  }

  useAuthStore.getState().setAuthenticated(user)
  useAppStore.getState().setTeacherName(user.displayName || user.email || 'Thầy/Cô')
  useAppStore.setState({ isSyncing: true })

  stopDataSync = subscribeFirestoreCollections(user.uid, {
    setClasses: (classes) => useAppStore.setState({ classes }),
    setStudents: (students) => useAppStore.setState({ students }),
    setExams: (exams) => useAppStore.setState({ exams }),
    setSubmissions: (submissions) => useAppStore.setState({ submissions }),
    onInitialHydrationTick: () => useAppStore.setState({ isSyncing: false }),
    onSnapshotError: (path, message) => {
      toast.error(`Firestore [${path}]: ${message}`)
    }
  })

  stopSettingsSync = subscribeAppSettings(user.uid, (message) => {
    toast.error(`Firestore [settings/app]: ${message}`)
  })
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

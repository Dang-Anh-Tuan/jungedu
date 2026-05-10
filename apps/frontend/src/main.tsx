import './i18n/i18n'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { toast } from 'sonner'
import App from './App'
import i18n from './i18n/i18n'
import { auth } from './lib/firebase'
import { subscribeAppSettings, subscribeFirestoreCollections } from './platform/persistence'
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
  useAppStore.getState().setTeacherName(user.displayName || user.email || i18n.t('defaults.teacherName'))
  useAppStore.setState({ isSyncing: true })

  stopDataSync = subscribeFirestoreCollections(user.uid, {
    setClasses: (classes) => useAppStore.setState({ classes }),
    setStudents: (students) => useAppStore.setState({ students }),
    setExams: (exams) => useAppStore.setState({ exams }),
    setSubmissions: (submissions) => useAppStore.setState({ submissions }),
    onInitialHydrationTick: () => useAppStore.setState({ isSyncing: false }),
    onSnapshotError: (path, message) => {
      toast.error(i18n.t('errors.firestorePath', { path, message }))
    }
  })

  stopSettingsSync = subscribeAppSettings(user.uid, (message) => {
    toast.error(i18n.t('errors.firestoreSettings', { message }))
  })
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

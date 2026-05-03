import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { toast } from 'sonner'
import App from './App'
import {
  subscribeAppSettingsDriveUploadFolder,
  subscribeFirestoreCollections
} from './services/firebase'
import { useAppStore } from './state/appStore'
import './index.css'

subscribeFirestoreCollections({
  setClasses: (classes) => useAppStore.setState({ classes }),
  setStudents: (students) => useAppStore.setState({ students }),
  setExams: (exams) => useAppStore.setState({ exams }),
  setSubmissions: (submissions) => useAppStore.setState({ submissions }),
  onInitialHydrationTick: () => useAppStore.setState({ isSyncing: false }),
  onSnapshotError: (path, message) => {
    toast.error(`Firestore [${path}]: ${message}`)
  }
})

subscribeAppSettingsDriveUploadFolder((message) => {
  toast.error(`Firestore [settings/app]: ${message}`)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

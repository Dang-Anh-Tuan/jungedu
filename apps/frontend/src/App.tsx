import React from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ClassesPage from './pages/ClassesPage'
import ExamsPage from './pages/ExamsPage'
import CreateExamPage from './pages/CreateExamPage'
import EditExamPage from './pages/EditExamPage'
import SubmissionImportPage from './pages/SubmissionImportPage'
import OcrConfirmPage from './pages/OcrConfirmPage'
import GradingPage from './pages/GradingPage'
import ReviewPage from './pages/ReviewPage'
import ProfilePage from './pages/ProfilePage'
import { useAuthStore } from './state/authStore'

function RedirectLegacySuaBai() {
  const { submissionId } = useParams()
  return <Navigate to={`/submissions/${submissionId}/sua-bai`} replace />
}

/** Đường dẫn bulk đã bỏ — chuyển sang bảng nhập bài theo lớp. */
function RedirectExamBulkToNew() {
  const { examId } = useParams()
  return <Navigate to={`/exams/${examId}/submissions/new`} replace />
}

export default function App() {
  const { status } = useAuthStore()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Đang kiểm tra đăng nhập...
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <LoginPage />
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/exams/new" element={<CreateExamPage />} />
        <Route path="/exams/:examId/edit" element={<EditExamPage />} />
        <Route path="/exams/:examId/submissions/new" element={<SubmissionImportPage />} />
        <Route path="/exams/:examId/submissions/bulk" element={<RedirectExamBulkToNew />} />
        <Route path="/submissions/:submissionId/sua-bai" element={<OcrConfirmPage />} />
        <Route path="/submissions/:submissionId/ocr-confirm" element={<RedirectLegacySuaBai />} />
        <Route path="/submissions/:submissionId/grading" element={<GradingPage />} />
        <Route path="/submissions/:submissionId/review" element={<ReviewPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

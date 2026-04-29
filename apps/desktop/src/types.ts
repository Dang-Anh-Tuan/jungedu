export type SchoolClass = {
  id: string
  name: string
  grade?: number
}

export type Student = {
  id: string
  classId: string
  /** Khớp với phần đầu tên file khi OCR/ghép ảnh hàng loạt, ví dụ HS01_1.jpg */
  studentCode?: string
  name: string
  /** Ví dụ: Giỏi, Khá, TB — gửi kèm khi AI chấm */
  hocLuc?: string
  tags?: string[]
  /** Ghi chú (vd: HS giỏi — kỳ vọng cao hơn) */
  notes?: string
  customRules?: string[]
}

export type ExamRubric = {
  content: number
  grammar: number
  creativity: number
  presentation: number
}

export type Exam = {
  id: string
  /** Danh sách học sinh lấy từ lớp được chọn */
  classId: string
  title: string
  subject: string
  grade: number
  requirements: string
  rubric: ExamRubric
  teacherStyle: 'encouraging' | 'neutral' | 'strict'
}

export type OcrPageResult = {
  id: string
  imageName: string
  ocrText: string
  /** Vision AI: -1. Dữ liệu cũ có thể còn điểm 0…1 từ pipeline OCR cục bộ đã gỡ. */
  confidence: number
  correctedText: string
}

export type Submission = {
  id: string
  examId: string
  studentId: string
  studentName: string
  imageFiles: { id: string; name: string; objectUrl: string; dataUrl: string }[]
  ocrPages: OcrPageResult[]
  gradingResult?: GradingResult
}

export type GradingRubricBreakdown = ExamRubric

export type GradingMistake = {
  type: 'spelling' | 'repeat' | 'grammar' | 'missing_idea' | 'structure' | 'other'
  original: string
  suggestion?: string
  explanation?: string
}

export type GradingResult = {
  score: number
  rubric: GradingRubricBreakdown
  strengths: string[]
  mistakes: GradingMistake[]
  rewriteSuggestion: string
  teacherComment: string
}

import type { GradingRubricScores, RubricCriterion } from './lib/rubric'

export type { GradingRubricScores, RubricCriterion }

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

/** Danh sách tiêu chí rubric (có thể thêm/bớt đầu mục). */
export type ExamRubric = RubricCriterion[]

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
  /** Chữ trích xuất / “dịch” từ AI Vision (ảnh → văn bản). */
  ocrText: string
  /** Vision AI: -1. Dữ liệu cũ có thể còn điểm 0…1 từ pipeline OCR cục bộ đã gỡ. */
  confidence: number
  /** Bản giáo viên chỉnh sau đối chiếu (sửa AI). */
  correctedText: string
}

/** Một ảnh trong bài nộp — Firebase Storage (`firebase`), Google Drive (`gdrive`), hoặc IndexedDB (`local`). */
export type SubmissionImageFile = {
  id: string
  name: string
  objectUrl: string
  dataUrl: string
  storageKind?: 'firebase' | 'local' | 'gdrive'
  /** Id file Drive khi `storageKind === 'gdrive'` */
  driveFileId?: string
  /** Khóa IndexedDB khi `storageKind === 'local'` */
  localKey?: string
}

export type Submission = {
  id: string
  examId: string
  studentId: string
  studentName: string
  /** Ảnh bài làm (URL Storage / blob / data URL tạm trên client). */
  imageFiles: SubmissionImageFile[]
  ocrPages: OcrPageResult[]
  /** Kết quả chấm AI (điểm, nhận xét, rubric…). */
  gradingResult?: GradingResult
  /** ISO: lần cuối chạy chuyển ảnh → chữ (AI). */
  visionConvertedAt?: string
  /** ISO: lần cuối chấm AI. */
  gradedAt?: string
  /** ISO: lần cuối GV sửa chữ (đối chiếu / OCR confirm). */
  teacherRevisedAt?: string
}

/** Điểm từng tiêu chí (khóa trùng `RubricCriterion.id` của bài kiểm tra). */
export type GradingRubricBreakdown = GradingRubricScores

export type GradingMistake = {
  type:
    | 'spelling'
    | 'repeat'
    | 'grammar'
    | 'punctuation'
    | 'missing_idea'
    | 'structure'
    | 'suggestion'
    | 'other'
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

/**
 * Lớp application: chấm bài qua AI.
 * Đổi vendor: thay `gradeEssayPipeline` (Gemini) bằng adapter backend khác nếu cần.
 */
import type { Exam, GradingResult, Student } from '../types'
import {
  gradeEssayPipeline,
  gradeEssaysBatchPipeline,
  type GradeEssayBatchItem
} from '../services/grading/pipeline'

export type GradeRequest = {
  essayText: string
  exam: Pick<Exam, 'requirements' | 'rubric' | 'title' | 'subject' | 'grade' | 'teacherStyle'>
  student: Pick<Student, 'tags' | 'notes' | 'name' | 'hocLuc'>
  teacherGradingExperience?: string
}

export type GradeBatchRequest = {
  exam: Pick<Exam, 'requirements' | 'rubric' | 'title' | 'subject' | 'grade' | 'teacherStyle'>
  items: GradeEssayBatchItem[]
  teacherGradingExperience?: string
}

export async function runAiGrade(req: GradeRequest): Promise<GradingResult> {
  return gradeEssayPipeline({
    essayText: req.essayText,
    exam: req.exam,
    student: req.student,
    teacherGradingExperience: req.teacherGradingExperience
  })
}

/** Một lần gọi AI chấm nhiều bài (tiết kiệm quota). */
export async function runAiGradeBatch(req: GradeBatchRequest): Promise<Map<string, GradingResult>> {
  return gradeEssaysBatchPipeline({
    exam: req.exam,
    items: req.items,
    teacherGradingExperience: req.teacherGradingExperience
  })
}

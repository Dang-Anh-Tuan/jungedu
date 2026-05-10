/**
 * Lớp application: chấm bài qua AI.
 * Đổi vendor: thay `gradeEssayPipeline` (hiện Puter) bằng adapter OpenAI/backend.
 */
import type { Exam, GradingResult, Student } from '../types'
import { gradeEssayPipeline } from '../services/grading/pipeline'

export type GradeRequest = {
  essayText: string
  exam: Pick<Exam, 'requirements' | 'rubric' | 'title' | 'subject' | 'grade' | 'teacherStyle'>
  student: Pick<Student, 'tags' | 'notes' | 'name' | 'hocLuc'>
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

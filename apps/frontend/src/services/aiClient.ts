import type { Exam, GradingResult, Student } from '../types'

import { gradeEssayPipeline } from './grading/pipeline'

type GradeRequest = {
  essayText: string
  exam: Pick<Exam, 'requirements' | 'rubric' | 'title' | 'subject' | 'grade' | 'teacherStyle'>
  student: Pick<Student, 'customRules' | 'tags' | 'notes' | 'name' | 'hocLuc'>
}

/** Chấm bài qua Puter AI (hai bước cleanup OCR + rubric JSON), không cần backend Express. */
export async function runAiGrade(req: GradeRequest): Promise<GradingResult> {
  return gradeEssayPipeline(req)
}

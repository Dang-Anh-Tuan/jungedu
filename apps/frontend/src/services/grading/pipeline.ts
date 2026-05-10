import type { Exam, GradingResult, Student } from '../../types'
import { pickRubricScoresForCriteria } from '../../lib/rubric'
import {
  GRADING_GLOBAL_RULES,
  GRADING_SYSTEM_PROMPT,
  buildGradingUserMessageSuffix,
  formatRubricCriteriaForPrompt,
  rubricJsonShapeExample
} from '../../prompts/gradingPrompts'
import { PUTER_GRADING_MODEL } from '../config'
import { GradingMistakeSchema, buildGradingResultSchema } from './schemas'
import { callPuterJson } from './puterJson'

export type GradePipelineRequest = {
  essayText: string
  exam: Pick<Exam, 'requirements' | 'rubric' | 'title' | 'subject' | 'grade' | 'teacherStyle'>
  student: Pick<Student, 'tags' | 'notes' | 'name' | 'hocLuc'>
  teacherGradingExperience?: string
}

/** Chấm rubric JSON qua Puter trực tiếp trên `essayText` (bản đã hiệu đính). */
export async function gradeEssayPipeline(req: GradePipelineRequest): Promise<GradingResult> {
  const body = req.essayText.trim()
  return gradeWithRubric({
    essayBody: body,
    exam: req.exam,
    student: req.student,
    teacherGradingExperience: req.teacherGradingExperience?.trim() ?? ''
  })
}

async function gradeWithRubric({
  essayBody,
  exam,
  student,
  teacherGradingExperience
}: {
  essayBody: string
  exam: Pick<Exam, 'title' | 'subject' | 'grade' | 'requirements' | 'rubric' | 'teacherStyle'>
  student: Pick<Student, 'name' | 'tags' | 'notes' | 'hocLuc'>
  teacherGradingExperience: string
}): Promise<GradingResult> {
  const rubricExplain = formatRubricCriteriaForPrompt(exam.rubric)
  const rubricJsonExample = rubricJsonShapeExample(exam.rubric)
  const schema = buildGradingResultSchema(exam.rubric)

  const messages = [
    {
      role: 'system' as const,
      content: GRADING_SYSTEM_PROMPT
    },
    {
      role: 'user' as const,
      content:
        JSON.stringify(
          {
            globalRules: [...GRADING_GLOBAL_RULES],
            teacherGradingExperience: teacherGradingExperience || undefined,
            examContext: {
              title: exam.title,
              subject: exam.subject,
              grade: exam.grade,
              requirements: exam.requirements,
              rubricCriteria: rubricExplain,
              rubricWeights: exam.rubric,
              teacherStyle: exam.teacherStyle
            },
            studentContext: {
              name: student.name,
              tags: student.tags ?? [],
              notes: student.notes ?? '',
              hocLuc: student.hocLuc ?? ''
            },
            essay: essayBody
          },
          null,
          2
        ) + buildGradingUserMessageSuffix(rubricJsonExample)
    }
  ]

  const result = await callPuterJson({
    messages,
    schema,
    model: PUTER_GRADING_MODEL,
    temperature: 0
  })

  const rubricPicked = pickRubricScoresForCriteria(result.rubric, exam.rubric)

  const normalized: GradingResult = {
    ...result,
    rubric: rubricPicked,
    rewriteSuggestion: result.rewriteSuggestion ?? '',
    teacherComment: result.teacherComment ?? '',
    mistakes: (result.mistakes ?? []).map((m) => GradingMistakeSchema.parse(m))
  }

  return normalized
}

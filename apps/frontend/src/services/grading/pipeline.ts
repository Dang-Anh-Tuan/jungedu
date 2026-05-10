import i18n from 'i18next'
import { z } from 'zod'

import type { Exam, GradingResult, Student } from '../../types'
import { pickRubricScoresForCriteria } from '../../lib/rubric'
import type { RubricCriterion } from '../../lib/rubric'
import {
  GRADING_GLOBAL_RULES,
  GRADING_SYSTEM_PROMPT,
  buildBatchGradingUserMessageSuffix,
  buildGradingUserMessageSuffix,
  formatRubricCriteriaForPrompt,
  rubricJsonShapeExample
} from '../../prompts/gradingPrompts'
import { LIMITS, TIMING } from '../../config/constants'
import { GEMINI_GRADING_MODEL } from '../config'
import { GradingMistakeSchema, buildGradingResultSchema } from './schemas'
import { callGeminiJson } from './geminiJson'

export type GradePipelineRequest = {
  essayText: string
  exam: Pick<Exam, 'requirements' | 'rubric' | 'title' | 'subject' | 'grade' | 'teacherStyle'>
  student: Pick<Student, 'tags' | 'notes' | 'name' | 'hocLuc'>
  teacherGradingExperience?: string
}

/** Chấm rubric JSON qua Gemini API (`VITE_GEMINI_API_KEY`) trên `essayText` (bản đã hiệu đính). */
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

  const result = await callGeminiJson({
    messages,
    schema,
    model: GEMINI_GRADING_MODEL,
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

export type GradeEssayBatchItem = {
  submissionId: string
  studentId: string
  essayText: string
  student: Pick<Student, 'name' | 'tags' | 'notes' | 'hocLuc'>
}

function buildBatchGradingEnvelopeSchema(criteria: RubricCriterion[]) {
  const row = buildGradingResultSchema(criteria).extend({ submissionId: z.string() })
  return z.object({ results: z.array(row) })
}

/** Một lần gọi API cho một đoạn danh sách bài (đã chunk). */
async function gradeEssaysBatchOneChunk({
  exam,
  items,
  teacherGradingExperience
}: {
  exam: Pick<Exam, 'title' | 'subject' | 'grade' | 'requirements' | 'rubric' | 'teacherStyle'>
  items: GradeEssayBatchItem[]
  teacherGradingExperience: string
}): Promise<Map<string, GradingResult>> {
  const rubricExplain = formatRubricCriteriaForPrompt(exam.rubric)
  const rubricJsonExample = rubricJsonShapeExample(exam.rubric)
  const schema = buildBatchGradingEnvelopeSchema(exam.rubric)

  const messages = [
    { role: 'system' as const, content: GRADING_SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content:
        JSON.stringify(
          {
            mode: 'batch_grade',
            globalRules: [...GRADING_GLOBAL_RULES],
            teacherGradingExperience: teacherGradingExperience.trim() || undefined,
            examContext: {
              title: exam.title,
              subject: exam.subject,
              grade: exam.grade,
              requirements: exam.requirements,
              rubricCriteria: rubricExplain,
              rubricWeights: exam.rubric,
              teacherStyle: exam.teacherStyle
            },
            submissions: items.map((it) => ({
              submissionId: it.submissionId,
              studentContext: {
                name: it.student.name,
                tags: it.student.tags ?? [],
                notes: it.student.notes ?? '',
                hocLuc: it.student.hocLuc ?? ''
              },
              essay: it.essayText.trim()
            }))
          },
          null,
          2
        ) + buildBatchGradingUserMessageSuffix(rubricJsonExample)
    }
  ]

  const parsed = await callGeminiJson({
    messages,
    schema,
    model: GEMINI_GRADING_MODEL,
    temperature: 0,
    maxOutputTokens: LIMITS.BATCH_GRADING_MAX_TOKENS,
    timeoutMs: TIMING.AI_BULK_TIMEOUT_MS
  })

  const expected = new Set(items.map((i) => i.submissionId))
  const got = new Set(parsed.results.map((r) => r.submissionId))
  if (got.size !== expected.size || ![...expected].every((id) => got.has(id))) {
    throw new Error(i18n.t('errors.geminiBatchGradeInvalid'))
  }

  const out = new Map<string, GradingResult>()
  for (const row of parsed.results) {
    const rubricPicked = pickRubricScoresForCriteria(row.rubric, exam.rubric)
    const normalized: GradingResult = {
      score: row.score,
      rubric: rubricPicked,
      rewriteSuggestion: row.rewriteSuggestion ?? '',
      teacherComment: row.teacherComment ?? '',
      strengths: row.strengths ?? [],
      mistakes: (row.mistakes ?? []).map((m) => GradingMistakeSchema.parse(m))
    }
    out.set(row.submissionId, normalized)
  }
  return out
}

/**
 * Chấm nhiều bài qua Gemini: tự chia theo `LIMITS.BULK_GRADING_SUBMISSIONS_PER_CHUNK`
 * để tránh cắt cụt output (~65k token), gộp `Map` kết quả.
 */
export async function gradeEssaysBatchPipeline({
  exam,
  items,
  teacherGradingExperience = ''
}: {
  exam: Pick<Exam, 'title' | 'subject' | 'grade' | 'requirements' | 'rubric' | 'teacherStyle'>
  items: GradeEssayBatchItem[]
  teacherGradingExperience?: string
}): Promise<Map<string, GradingResult>> {
  if (items.length === 0) {
    return new Map()
  }

  const exp = teacherGradingExperience.trim()
  const maxPer = LIMITS.BULK_GRADING_SUBMISSIONS_PER_CHUNK
  const merged = new Map<string, GradingResult>()

  for (let i = 0; i < items.length; i += maxPer) {
    const slice = items.slice(i, i + maxPer)
    const part = await gradeEssaysBatchOneChunk({ exam, items: slice, teacherGradingExperience: exp })
    for (const [k, v] of part) merged.set(k, v)
  }

  return merged
}

import { z } from 'zod'

import type { RubricCriterion } from '../../lib/rubric'

export const GradingMistakeSchema = z.object({
  type: z.enum(['spelling', 'repeat', 'grammar', 'missing_idea', 'structure', 'suggestion', 'other']),
  original: z.string(),
  suggestion: z.string().optional(),
  explanation: z.string().optional()
})

export function buildGradingResultSchema(criteria: RubricCriterion[]) {
  const ids = criteria.map((c) => c.id)
  return z.object({
    score: z.number(),
    rubric: z
      .record(z.string(), z.number())
      .refine((r) => ids.every((id) => typeof r[id] === 'number'), {
        message: 'rubric must include a numeric score for each criterion id'
      }),
    strengths: z.array(z.string()),
    mistakes: z.array(GradingMistakeSchema),
    rewriteSuggestion: z.string(),
    teacherComment: z.string()
  })
}

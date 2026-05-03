import { z } from 'zod'

export const CleanupSchema = z.object({
  correctedText: z.string()
})

export const GradingRubricSchema = z.object({
  content: z.number(),
  grammar: z.number(),
  creativity: z.number(),
  presentation: z.number()
})

export const GradingMistakeSchema = z.object({
  type: z.enum(['spelling', 'repeat', 'grammar', 'missing_idea', 'structure', 'suggestion', 'other']),
  original: z.string(),
  suggestion: z.string().optional(),
  explanation: z.string().optional()
})

export const GradingResultSchema = z.object({
  score: z.number(),
  rubric: GradingRubricSchema,
  strengths: z.array(z.string()),
  mistakes: z.array(GradingMistakeSchema),
  rewriteSuggestion: z.string(),
  teacherComment: z.string()
})

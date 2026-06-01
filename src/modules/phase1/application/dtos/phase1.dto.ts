import { z } from 'zod'

export const alternativeKeySchema = z.enum(['A', 'B', 'C', 'D', 'E'])
export const difficultySchema = z.enum(['beginner', 'intermediate', 'advanced'])
export const sourceSchema = z.enum(['inep', 'ai_generated', 'all'])

export const listObjectiveQuestionsSchema = z.object({
  specialty_id: z.coerce.number().int().positive().optional(),
  difficulty: difficultySchema.optional(),
  source: sourceSchema.default('all'),
  year: z.coerce.number().int().min(2011).max(2100).optional(),
  edition: z.string().trim().min(1).max(50).optional(),
  tag: z.string().trim().min(1).max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const answerObjectiveQuestionSchema = z.object({
  selected_alternative: alternativeKeySchema,
  time_spent_secs: z.coerce.number().int().min(0).max(86400).optional(),
})

export const createSimulationSchema = z.object({
  question_count: z.coerce.number().int().min(1).max(200).default(100),
  difficulty: z.array(difficultySchema).min(1).max(3).optional(),
  source: sourceSchema.default('all'),
  specialty_ids: z.array(z.coerce.number().int().positive()).default([]),
  timed_limit_secs: z.coerce.number().int().min(60).max(86400).default(18000),
})

export const saveSimulationAnswerSchema = z.object({
  question_id: z.string().uuid(),
  selected_alternative: alternativeKeySchema,
  time_spent_secs: z.coerce.number().int().min(0).max(86400).optional(),
})

const activeElapsedSecsSchema = z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER)

export const syncSimulationActivitySchema = z.object({
  active_elapsed_secs: activeElapsedSecsSchema,
})

export const completeSimulationSchema = z.object({
  active_elapsed_secs: activeElapsedSecsSchema.optional(),
}).default({})

export const listSimulationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const importQuestionSchema = z.object({
  specialty_id: z.coerce.number().int().positive().nullable().optional(),
  stem: z.string().trim().min(10),
  alternatives: z.array(z.object({
    key: alternativeKeySchema,
    text: z.string().trim().min(1),
  })).min(2).max(5),
  correct_alternative: alternativeKeySchema,
  explanation: z.string().trim().nullable().optional(),
  difficulty: difficultySchema,
  status: z.enum(['draft', 'pending_review', 'approved', 'rejected', 'regenerating']).default('approved'),
  source_label: z.string().trim().min(1),
  year: z.coerce.number().int().min(2011).max(2100).nullable().optional(),
  edition: z.string().trim().min(1).max(50).nullable().optional(),
  external_id: z.string().trim().min(3),
  source_url: z.string().url().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).default([]),
  is_annulled: z.boolean().default(false),
})

export const importInepQuestionsSchema = z.object({
  questions: z.array(importQuestionSchema).min(1).max(500),
})

export type ListObjectiveQuestionsDto = z.infer<typeof listObjectiveQuestionsSchema>
export type AnswerObjectiveQuestionDto = z.infer<typeof answerObjectiveQuestionSchema>
export type CreateSimulationDto = z.infer<typeof createSimulationSchema>
export type SaveSimulationAnswerDto = z.infer<typeof saveSimulationAnswerSchema>
export type SyncSimulationActivityDto = z.infer<typeof syncSimulationActivitySchema>
export type CompleteSimulationDto = z.infer<typeof completeSimulationSchema>
export type ListSimulationsDto = z.infer<typeof listSimulationsSchema>
export type ImportInepQuestionsDto = z.infer<typeof importInepQuestionsSchema>

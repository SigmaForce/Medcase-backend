import { z } from 'zod'

export const generateCaseSchema = z.object({
  specialty_id: z.number().int().positive(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  language: z.enum(['pt', 'es']),
  country_context: z.enum(['BR', 'PY']),
})

export type GenerateCaseDto = z.infer<typeof generateCaseSchema>

import { z } from 'zod'

export const listCasesSchema = z.object({
  specialty_id: z.coerce.number().int().positive().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  language: z.enum(['pt', 'es']).optional(),
  country: z.enum(['BR', 'PY']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export type ListCasesDto = z.infer<typeof listCasesSchema>

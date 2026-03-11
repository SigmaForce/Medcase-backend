import { z } from 'zod'

export const startSessionSchema = z.object({
  case_id: z.string().uuid('case_id must be a valid UUID'),
  is_timed: z.boolean().optional().default(false),
})

export type StartSessionDto = z.infer<typeof startSessionSchema>

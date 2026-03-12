import { z } from 'zod'

export const listQueueSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'regenerating']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export type ListQueueDto = z.infer<typeof listQueueSchema>

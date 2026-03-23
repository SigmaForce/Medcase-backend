import { z } from 'zod'

export const updateProfileSchema = z.object({
  full_name: z.string().min(1).optional(),
  country: z.enum(['BR', 'PY']).optional(),
  university: z.string().min(1).optional(),
})

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>

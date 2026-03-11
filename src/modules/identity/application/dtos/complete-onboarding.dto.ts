import { z } from 'zod'

export const completeOnboardingSchema = z.object({
  country: z.enum(['BR', 'PY']),
  university: z.string().min(2),
})

export interface CompleteOnboardingDto extends z.infer<typeof completeOnboardingSchema> {}

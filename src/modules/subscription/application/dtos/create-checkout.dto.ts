import { z } from 'zod'

export const createCheckoutSchema = z.object({
  plan: z.enum(['pro']),
  success_url: z.url(),
  cancel_url: z.url(),
})

export type CreateCheckoutDto = z.infer<typeof createCheckoutSchema>

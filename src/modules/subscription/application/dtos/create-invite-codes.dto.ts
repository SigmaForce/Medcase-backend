import { z } from 'zod'

export const createInviteCodesSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(1000),
  expires_at: z.iso.date(),
  trial_days: z.coerce.number().int().min(1).default(30),
  label: z.string().min(1),
})

export type CreateInviteCodesDto = z.infer<typeof createInviteCodesSchema>

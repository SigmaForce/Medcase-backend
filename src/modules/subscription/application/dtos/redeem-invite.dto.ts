import { z } from 'zod'

export const redeemInviteSchema = z.object({
  code: z.string().min(1),
})

export type RedeemInviteDto = z.infer<typeof redeemInviteSchema>

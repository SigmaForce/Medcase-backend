import { z } from 'zod'

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
})

export interface ResetPasswordDto extends z.infer<typeof resetPasswordSchema> {}

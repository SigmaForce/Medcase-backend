import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  email: z.email(),
})

export interface ForgotPasswordDto extends z.infer<typeof forgotPasswordSchema> {}

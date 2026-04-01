import { z } from 'zod'

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).optional(),
})

export interface RefreshTokenDto extends z.infer<typeof refreshTokenSchema> {}

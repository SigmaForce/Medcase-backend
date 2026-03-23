import { z } from 'zod'

export const registerUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  country: z.enum(['BR', 'PY']),
  university: z.string().min(2),
  invite_code: z.string().optional(),
})

export interface RegisterUserDto extends z.infer<typeof registerUserSchema> {}

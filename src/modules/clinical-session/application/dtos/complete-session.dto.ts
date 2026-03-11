import { z } from 'zod'

export const completeSessionSchema = z.object({
  submitted_diagnosis: z
    .string()
    .min(20, 'submitted_diagnosis must be at least 20 characters'),
  submitted_management: z
    .string()
    .min(20, 'submitted_management must be at least 20 characters'),
})

export type CompleteSessionDto = z.infer<typeof completeSessionSchema>

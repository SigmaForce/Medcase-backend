import { z } from 'zod'

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'content is required').max(3000),
})

export type SendMessageDto = z.infer<typeof sendMessageSchema>

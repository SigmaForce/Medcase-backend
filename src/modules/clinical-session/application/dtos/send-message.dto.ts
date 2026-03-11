import { z } from 'zod'

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'content is required'),
})

export type SendMessageDto = z.infer<typeof sendMessageSchema>

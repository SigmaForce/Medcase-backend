export type MessageRoleValue = 'user' | 'assistant' | 'system'

export interface MessageMeta {
  type?: string
  tokens_used?: number
  flagged?: boolean
  flag_reason?: string
  [key: string]: unknown
}

export interface CreateMessageTurnProps {
  id?: string
  sessionId: string
  role: MessageRoleValue
  content: string
  meta?: MessageMeta
  createdAt?: Date
}

export class MessageTurn {
  id: string
  sessionId: string
  role: MessageRoleValue
  content: string
  meta: MessageMeta
  createdAt: Date

  static create(props: CreateMessageTurnProps): MessageTurn {
    const message = new MessageTurn()
    message.id = props.id ?? ''
    message.sessionId = props.sessionId
    message.role = props.role
    message.content = props.content
    message.meta = props.meta ?? {}
    message.createdAt = props.createdAt ?? new Date()
    return message
  }
}

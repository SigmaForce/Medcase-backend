import { Inject, Injectable } from '@nestjs/common'
import { ISessionRepository } from '../../domain/interfaces/session-repository.interface'
import { DomainException } from '../../../../errors/domain-exception'
import { sendMessageSchema } from '../dtos/send-message.dto'
import { ChatOrchestratorService } from '../../infrastructure/services/chat-orchestrator.service'
import { RevalidaOrchestratorService } from '../../infrastructure/services/revalida-orchestrator.service'

export interface SendMessageInput {
  sessionId: string
  userId: string
  content: string
}

export interface SendMessageOutput {
  message: {
    id: string
    role: string
    content: string
    created_at: Date
    meta: Record<string, unknown>
  }
  session: {
    messages_count: number
    messages_remaining: number
  }
}

const MAX_MESSAGES = 150

@Injectable()
export class SendMessage {
  constructor(
    @Inject('ISessionRepository') private readonly sessionRepo: ISessionRepository,
    private readonly chatOrchestrator: ChatOrchestratorService,
    private readonly revalidaOrchestrator: RevalidaOrchestratorService,
  ) {}

  async execute(input: SendMessageInput): Promise<SendMessageOutput> {
    const data = sendMessageSchema.parse({ content: input.content })

    const session = await this.sessionRepo.findById(input.sessionId)
    if (!session) {
      throw new DomainException('SESSION_NOT_FOUND', 404)
    }

    if (session.userId !== input.userId) {
      throw new DomainException('FORBIDDEN', 403)
    }

    if (!session.isInProgress()) {
      throw new DomainException('SESSION_ALREADY_COMPLETED', 400)
    }

    if (data.content.trim().length === 0) {
      throw new DomainException('EMPTY_MESSAGE', 400)
    }

    const messagesCount = await this.sessionRepo.countMessages(input.sessionId)
    if (messagesCount >= MAX_MESSAGES) {
      throw new DomainException('SESSION_LIMIT_REACHED', 400)
    }

    const clinicalCase = await this.sessionRepo.findCaseById(session.caseId)
    if (!clinicalCase) {
      throw new DomainException('CASE_NOT_FOUND', 404)
    }

    const brief = clinicalCase.caseBrief as Record<string, unknown>
    const patientProfile = (brief.patient_profile as Record<string, unknown>) ?? {}

    const assistantMessage =
      session.sessionType === 'revalida'
        ? await this.revalidaOrchestrator.orchestrate({
            session,
            userContent: data.content,
            clinicalCase,
            patientProfile,
          })
        : await this.chatOrchestrator.orchestrate({
            session,
            userContent: data.content,
            clinicalCase,
          })

    const newMessagesCount = messagesCount + 2 // user + assistant
    const messagesRemaining = Math.max(0, MAX_MESSAGES - newMessagesCount)

    return {
      message: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        created_at: assistantMessage.createdAt,
        meta: assistantMessage.meta,
      },
      session: {
        messages_count: newMessagesCount,
        messages_remaining: messagesRemaining,
      },
    }
  }
}

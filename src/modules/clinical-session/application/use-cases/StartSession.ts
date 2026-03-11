import { Inject, Injectable } from '@nestjs/common'
import { ISessionRepository } from '../../domain/interfaces/session-repository.interface'
import { ClinicalSession } from '../../domain/entities/clinical-session.entity'
import { MessageTurn } from '../../domain/entities/message-turn.entity'
import { DomainException } from '../../../../errors/domain-exception'
import { startSessionSchema } from '../dtos/start-session.dto'

export interface StartSessionInput {
  userId: string
  caseId: string
  isTimed?: boolean
}

export interface StartSessionOutput {
  session: {
    id: string
    case_id: string
    status: string
    is_timed: boolean
    started_at: Date
    messages: Array<{
      id: string
      role: string
      content: string
      created_at: Date
      meta: Record<string, unknown>
    }>
  }
  subscription: {
    cases_used: number
    cases_remaining: number
  }
}

@Injectable()
export class StartSession {
  constructor(
    @Inject('ISessionRepository') private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(input: StartSessionInput): Promise<StartSessionOutput> {
    const data = startSessionSchema.parse({
      case_id: input.caseId,
      is_timed: input.isTimed,
    })

    const subscription = await this.sessionRepo.getSubscription(input.userId)
    if (!subscription) {
      throw new DomainException('SUBSCRIPTION_NOT_FOUND', 404)
    }

    if (subscription.casesUsed >= subscription.casesLimit) {
      throw new DomainException('USAGE_LIMIT_REACHED', 403, JSON.stringify({ reset_at: subscription.usageResetAt }))
    }

    if (data.is_timed && subscription.plan !== 'pro') {
      throw new DomainException('TIMED_MODE_REQUIRES_PRO', 403)
    }

    const clinicalCase = await this.sessionRepo.findCaseById(data.case_id)
    if (!clinicalCase || clinicalCase.status !== 'approved') {
      throw new DomainException('CASE_NOT_FOUND', 404)
    }

    const existingSession = await this.sessionRepo.findByUserAndCase(input.userId, data.case_id)
    if (
      existingSession &&
      (existingSession.status === 'in_progress' || existingSession.status === 'completed')
    ) {
      throw new DomainException('CASE_ALREADY_STARTED', 403)
    }

    await this.sessionRepo.incrementCasesUsed(input.userId)

    const session = ClinicalSession.create({
      userId: input.userId,
      caseId: data.case_id,
      isTimed: data.is_timed,
      timedLimitSecs: 2700,
    })

    const createdSession = await this.sessionRepo.create(session)

    const brief = clinicalCase.caseBrief as Record<string, unknown>
    const openingMessage = (brief.opening_message as string | undefined) ?? 'Olá, pode me ajudar?'

    const firstMessage = MessageTurn.create({
      sessionId: createdSession.id,
      role: 'assistant',
      content: openingMessage,
      meta: { type: 'opening' },
    })

    const savedMessage = await this.sessionRepo.addMessage(firstMessage)

    const casesRemaining = Math.max(0, subscription.casesLimit - (subscription.casesUsed + 1))

    return {
      session: {
        id: createdSession.id,
        case_id: createdSession.caseId,
        status: createdSession.status,
        is_timed: createdSession.isTimed,
        started_at: createdSession.startedAt,
        messages: [
          {
            id: savedMessage.id,
            role: savedMessage.role,
            content: savedMessage.content,
            created_at: savedMessage.createdAt,
            meta: savedMessage.meta,
          },
        ],
      },
      subscription: {
        cases_used: subscription.casesUsed + 1,
        cases_remaining: casesRemaining,
      },
    }
  }
}

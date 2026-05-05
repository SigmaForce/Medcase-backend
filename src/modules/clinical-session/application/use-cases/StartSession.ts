import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ISessionRepository } from '../../domain/interfaces/session-repository.interface'
import { ClinicalSession } from '../../domain/entities/clinical-session.entity'
import { MessageTurn } from '../../domain/entities/message-turn.entity'
import { DomainException } from '../../../../errors/domain-exception'
import { startSessionSchema } from '../dtos/start-session.dto'
import { PostHogService } from '../../../analytics/infrastructure/services/posthog.service'

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
    private readonly eventEmitter: EventEmitter2,
    private readonly postHogService: PostHogService,
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

    if (data.is_timed && subscription.plan !== 'pro') {
      throw new DomainException('TIMED_MODE_REQUIRES_PRO', 403)
    }

    const clinicalCase = await this.sessionRepo.findCaseById(data.case_id)
    if (!clinicalCase || clinicalCase.status !== 'approved') {
      throw new DomainException('CASE_NOT_FOUND', 404)
    }

    const inProgressSession = await this.sessionRepo.findInProgressByUserAndCase(input.userId, data.case_id)
    if (inProgressSession) {
      throw new DomainException('CASE_ALREADY_IN_PROGRESS', 403)
    }

    const incremented = await this.sessionRepo.incrementCasesUsedIfAllowed(input.userId)
    if (!incremented) {
      this.eventEmitter.emit('usage_limit.reached', { userId: input.userId })
      throw new DomainException('USAGE_LIMIT_REACHED', 403, JSON.stringify({ reset_at: subscription.usageResetAt }))
    }

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

    this.postHogService.track(input.userId, 'session_started', {
      plan: subscription.plan,
      is_timed: data.is_timed,
    })

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

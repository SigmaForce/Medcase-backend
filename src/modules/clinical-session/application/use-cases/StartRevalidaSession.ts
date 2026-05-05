import { Inject, Injectable } from '@nestjs/common'
import { ISessionRepository } from '../../domain/interfaces/session-repository.interface'
import { ClinicalSession } from '../../domain/entities/clinical-session.entity'
import { MessageTurn } from '../../domain/entities/message-turn.entity'
import { DomainException } from '../../../../errors/domain-exception'
import { z } from 'zod'

const startRevalidaSessionSchema = z.object({
  case_id: z.string().uuid('case_id must be a valid UUID'),
})

export interface StartRevalidaSessionInput {
  userId: string
  caseId: string
}

export interface StartRevalidaSessionOutput {
  session: {
    id: string
    case_id: string
    status: string
    session_type: string
    is_timed: boolean
    timed_limit_secs: number
    started_at: Date
    station_instructions: string
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
export class StartRevalidaSession {
  constructor(
    @Inject('ISessionRepository') private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(input: StartRevalidaSessionInput): Promise<StartRevalidaSessionOutput> {
    const data = startRevalidaSessionSchema.parse({ case_id: input.caseId })

    const subscription = await this.sessionRepo.getSubscription(input.userId)
    if (!subscription) {
      throw new DomainException('SUBSCRIPTION_NOT_FOUND', 404)
    }

    const clinicalCase = await this.sessionRepo.findCaseById(data.case_id)
    if (!clinicalCase || clinicalCase.status !== 'approved') {
      throw new DomainException('CASE_NOT_FOUND', 404)
    }

    const brief = clinicalCase.caseBrief as Record<string, unknown>
    if (!brief.patient_script || !brief.pep) {
      throw new DomainException('CASE_NOT_REVALIDA_FORMAT', 422)
    }

    const inProgressSession = await this.sessionRepo.findInProgressByUserAndCase(
      input.userId,
      data.case_id,
    )
    if (inProgressSession) {
      throw new DomainException('CASE_ALREADY_IN_PROGRESS', 403)
    }

    const incremented = await this.sessionRepo.incrementCasesUsedIfAllowed(input.userId)
    if (!incremented) {
      throw new DomainException(
        'USAGE_LIMIT_REACHED',
        403,
        JSON.stringify({ reset_at: subscription.usageResetAt }),
      )
    }

    const session = ClinicalSession.create({
      userId: input.userId,
      caseId: data.case_id,
      isTimed: true,
      timedLimitSecs: 600,
      sessionType: 'revalida',
    })

    const createdSession = await this.sessionRepo.create(session)

    const openingMessage = (brief.opening_message as string | undefined) ?? 'Olá, pode me ajudar?'
    const stationInstructions = (brief.station_instructions as string | undefined) ?? ''

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
        session_type: createdSession.sessionType,
        is_timed: createdSession.isTimed,
        timed_limit_secs: createdSession.timedLimitSecs,
        started_at: createdSession.startedAt,
        station_instructions: stationInstructions,
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

import { Inject, Injectable } from '@nestjs/common'
import { ISessionRepository } from '../../domain/interfaces/session-repository.interface'
import { DomainException } from '../../../../errors/domain-exception'

export interface GetSessionInput {
  sessionId: string
  userId: string
}

export interface GetSessionOutput {
  session: {
    id: string
    case_id: string
    status: string
    is_timed: boolean
    started_at: Date
    completed_at: Date | null
    duration_secs: number | null
    requested_exams: string[]
    missed_key_exams: string[]
    submitted_diagnosis: string | null
    submitted_management: string | null
    feedback: Record<string, unknown> | null
    messages: Array<{
      id: string
      role: string
      content: string
      created_at: Date
      meta: Record<string, unknown>
    }>
  }
}

@Injectable()
export class GetSession {
  constructor(
    @Inject('ISessionRepository') private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(input: GetSessionInput): Promise<GetSessionOutput> {
    const session = await this.sessionRepo.findById(input.sessionId)
    if (!session) {
      throw new DomainException('SESSION_NOT_FOUND', 404)
    }

    if (session.userId !== input.userId) {
      throw new DomainException('FORBIDDEN', 403)
    }

    const messages = await this.sessionRepo.getMessages(input.sessionId)

    return {
      session: {
        id: session.id,
        case_id: session.caseId,
        status: session.status,
        is_timed: session.isTimed,
        started_at: session.startedAt,
        completed_at: session.completedAt,
        duration_secs: session.durationSecs,
        requested_exams: session.requestedExams,
        missed_key_exams: session.missedKeyExams,
        submitted_diagnosis: session.submittedDiagnosis,
        submitted_management: session.submittedManagement,
        feedback: session.feedback,
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          created_at: m.createdAt,
          meta: m.meta,
        })),
      },
    }
  }
}

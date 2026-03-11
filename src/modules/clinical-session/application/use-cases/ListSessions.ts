import { Inject, Injectable } from '@nestjs/common'
import { ISessionRepository } from '../../domain/interfaces/session-repository.interface'
import { DomainException } from '../../../../errors/domain-exception'

export interface ListSessionsInput {
  userId: string
  status?: string
  page?: number
  limit?: number
}

export interface ListSessionsOutput {
  sessions: Array<{
    id: string
    case_id: string
    status: string
    is_timed: boolean
    started_at: Date
    completed_at: Date | null
    duration_secs: number | null
    requested_exams: string[]
    missed_key_exams: string[]
  }>
  pagination: {
    total: number
    page: number
    limit: number
    total_pages: number
  }
}

const VALID_STATUSES = ['in_progress', 'completed', 'abandoned']

@Injectable()
export class ListSessions {
  constructor(
    @Inject('ISessionRepository') private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(input: ListSessionsInput): Promise<ListSessionsOutput> {
    const page = Math.max(1, input.page ?? 1)
    const limit = Math.min(100, Math.max(1, input.limit ?? 20))

    if (input.status && !VALID_STATUSES.includes(input.status)) {
      throw new DomainException('INVALID_SESSION_STATUS', 400)
    }

    const { sessions, total } = await this.sessionRepo.findByUser(input.userId, {
      status: input.status,
      page,
      limit,
    })

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        case_id: s.caseId,
        status: s.status,
        is_timed: s.isTimed,
        started_at: s.startedAt,
        completed_at: s.completedAt,
        duration_secs: s.durationSecs,
        requested_exams: s.requestedExams,
        missed_key_exams: s.missedKeyExams,
      })),
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    }
  }
}

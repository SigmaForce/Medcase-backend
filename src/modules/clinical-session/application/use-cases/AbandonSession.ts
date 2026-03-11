import { Inject, Injectable } from '@nestjs/common'
import { ISessionRepository } from '../../domain/interfaces/session-repository.interface'
import { DomainException } from '../../../../errors/domain-exception'

export interface AbandonSessionInput {
  sessionId: string
  userId: string
}

export interface AbandonSessionOutput {
  session: {
    status: string
  }
}

@Injectable()
export class AbandonSession {
  constructor(
    @Inject('ISessionRepository') private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(input: AbandonSessionInput): Promise<AbandonSessionOutput> {
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

    session.abandon()
    await this.sessionRepo.update(session)

    return {
      session: {
        status: 'abandoned',
      },
    }
  }
}

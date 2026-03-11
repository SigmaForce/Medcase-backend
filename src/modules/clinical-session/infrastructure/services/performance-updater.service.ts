import { Inject, Injectable } from '@nestjs/common'
import { ISessionRepository, FeedbackData } from '../../domain/interfaces/session-repository.interface'

export interface PerformanceUpdateInput {
  userId: string
  specialtyId: number
  feedback: FeedbackData
}

@Injectable()
export class PerformanceUpdaterService {
  constructor(
    @Inject('ISessionRepository') private readonly sessionRepo: ISessionRepository,
  ) {}

  async update(input: PerformanceUpdateInput): Promise<void> {
    await this.sessionRepo.upsertPerformance({
      userId: input.userId,
      specialtyId: input.specialtyId,
      feedback: input.feedback,
    })
  }
}

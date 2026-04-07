import { Inject, Injectable } from '@nestjs/common'
import { IReviewQueueRepository } from '../../domain/interfaces/review-queue-repository.interface'
import { DomainException } from '../../../../errors/domain-exception'

export interface GetReviewQueueCountInput {
  role: string
  status?: string
}

@Injectable()
export class GetReviewQueueCount {
  constructor(
    @Inject('IReviewQueueRepository') private readonly queueRepo: IReviewQueueRepository,
  ) {}

  async execute({ role, status }: GetReviewQueueCountInput): Promise<{ count: number }> {
    if (role !== 'reviewer' && role !== 'admin') {
      throw new DomainException('FORBIDDEN', 403)
    }

    const count = await this.queueRepo.count(status)
    return { count }
  }
}

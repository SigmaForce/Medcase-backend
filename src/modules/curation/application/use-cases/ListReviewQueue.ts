import { Inject, Injectable } from '@nestjs/common'
import { IReviewQueueRepository, ListQueueFilters } from '../../domain/interfaces/review-queue-repository.interface'
import { DomainException } from '../../../../errors/domain-exception'

export interface ListReviewQueueInput {
  role: string
  status?: string
  page: number
  limit: number
}

@Injectable()
export class ListReviewQueue {
  constructor(
    @Inject('IReviewQueueRepository') private readonly queueRepo: IReviewQueueRepository,
  ) {}

  async execute(input: ListReviewQueueInput) {
    if (input.role !== 'reviewer' && input.role !== 'admin') {
      throw new DomainException('FORBIDDEN', 403)
    }

    const filters: ListQueueFilters = {
      status: input.status,
      page: input.page,
      limit: input.limit,
    }

    return this.queueRepo.list(filters)
  }
}

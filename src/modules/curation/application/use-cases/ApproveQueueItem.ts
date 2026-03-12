import { Inject, Injectable } from '@nestjs/common'
import { IReviewQueueRepository } from '../../domain/interfaces/review-queue-repository.interface'
import { IClinicalCaseRepository } from '../../../clinical-case/domain/interfaces/clinical-case-repository.interface'
import { DomainException } from '../../../../errors/domain-exception'

export interface ApproveQueueItemInput {
  itemId: string
  userId: string
  role: string
}

@Injectable()
export class ApproveQueueItem {
  constructor(
    @Inject('IReviewQueueRepository') private readonly queueRepo: IReviewQueueRepository,
    @Inject('IClinicalCaseRepository') private readonly caseRepo: IClinicalCaseRepository,
  ) {}

  async execute({ itemId, userId, role }: ApproveQueueItemInput) {
    if (role !== 'reviewer' && role !== 'admin') {
      throw new DomainException('FORBIDDEN', 403)
    }

    const item = await this.queueRepo.findById(itemId)
    if (!item) {
      throw new DomainException('QUEUE_ITEM_NOT_FOUND', 404)
    }

    if (item.status !== 'pending') {
      throw new DomainException('QUEUE_ITEM_NOT_PENDING', 400)
    }

    item.status = 'approved'
    item.reviewedById = userId
    item.reviewedAt = new Date()
    await this.queueRepo.update(item)

    const clinicalCase = await this.caseRepo.findById(item.caseId)
    if (!clinicalCase) {
      throw new DomainException('CASE_NOT_FOUND', 404)
    }

    clinicalCase.status = 'approved'
    await this.caseRepo.update(clinicalCase)

    return {
      queueItem: { id: item.id, status: item.status, reviewedAt: item.reviewedAt },
      case: { id: clinicalCase.id, status: clinicalCase.status },
    }
  }
}

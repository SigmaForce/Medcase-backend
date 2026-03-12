import { Inject, Injectable } from '@nestjs/common'
import { IClinicalCaseRepository } from '../../../clinical-case/domain/interfaces/clinical-case-repository.interface'
import { ICaseRatingRepository } from '../../domain/interfaces/case-rating-repository.interface'
import { IReviewQueueRepository } from '../../domain/interfaces/review-queue-repository.interface'
import { ISessionRepository } from '../../../clinical-session/domain/interfaces/session-repository.interface'
import { CaseRating } from '../../domain/entities/case-rating.entity'
import { ReviewQueueItem } from '../../domain/entities/review-queue-item.entity'
import { DomainException } from '../../../../errors/domain-exception'
import { submitRatingSchema, SubmitRatingDto } from '../dtos/submit-rating.dto'

export interface SubmitRatingInput {
  caseId: string
  userId: string
  score: number
  issues?: string[]
  comment?: string
}

@Injectable()
export class SubmitRating {
  constructor(
    @Inject('IClinicalCaseRepository') private readonly caseRepo: IClinicalCaseRepository,
    @Inject('ICaseRatingRepository') private readonly ratingRepo: ICaseRatingRepository,
    @Inject('IReviewQueueRepository') private readonly queueRepo: IReviewQueueRepository,
    @Inject('ISessionRepository') private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(input: SubmitRatingInput) {
    const data = submitRatingSchema.parse({
      score: input.score,
      issues: input.issues,
      comment: input.comment,
    }) as SubmitRatingDto

    const clinicalCase = await this.caseRepo.findById(input.caseId)
    if (!clinicalCase) {
      throw new DomainException('CASE_NOT_FOUND', 404)
    }

    if (clinicalCase.status !== 'approved') {
      throw new DomainException('CASE_NOT_AVAILABLE', 403)
    }

    const hasCompleted = await this.sessionRepo.findCompletedByUserAndCase(input.userId, input.caseId)
    if (!hasCompleted) {
      throw new DomainException('SESSION_NOT_COMPLETED', 403)
    }

    const existing = await this.ratingRepo.findByUserAndCase(input.userId, input.caseId)
    if (existing) {
      throw new DomainException('ALREADY_RATED', 409)
    }

    const rating = CaseRating.create({
      caseId: input.caseId,
      userId: input.userId,
      score: data.score,
      issues: data.issues ?? [],
      comment: data.comment ?? null,
    })

    const saved = await this.ratingRepo.create(rating)

    const [count, avg] = await Promise.all([
      this.ratingRepo.countByCase(input.caseId),
      this.ratingRepo.avgByCase(input.caseId),
    ])

    clinicalCase.totalRatings = count
    clinicalCase.avgRating = avg
    await this.caseRepo.update(clinicalCase)

    if (avg < 3.0 && count >= 5 && clinicalCase.status === 'approved') {
      clinicalCase.status = 'pending_review'
      await this.caseRepo.update(clinicalCase)

      const existingQueueItem = await this.queueRepo.findByCaseId(input.caseId)
      if (!existingQueueItem) {
        await this.queueRepo.create(ReviewQueueItem.create({ caseId: input.caseId }))
      }
    }

    return {
      rating: {
        id: saved.id,
        caseId: saved.caseId,
        score: saved.score,
        createdAt: saved.createdAt,
      },
      case: {
        avgRating: avg,
        totalRatings: count,
      },
    }
  }
}

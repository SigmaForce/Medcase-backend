import { Inject, Injectable } from '@nestjs/common'
import { ICaseRatingRepository } from '../../domain/interfaces/case-rating-repository.interface'
import { DomainException } from '../../../../errors/domain-exception'

export interface GetMyRatingInput {
  caseId: string
  userId: string
}

@Injectable()
export class GetMyRating {
  constructor(
    @Inject('ICaseRatingRepository') private readonly ratingRepo: ICaseRatingRepository,
  ) {}

  async execute({ caseId, userId }: GetMyRatingInput) {
    const rating = await this.ratingRepo.findByUserAndCase(userId, caseId)
    if (!rating) {
      throw new DomainException('RATING_NOT_FOUND', 404)
    }

    return {
      rated: true,
      rating: {
        score: rating.score,
        comment: rating.comment,
        issues: rating.issues,
        createdAt: rating.createdAt,
      },
    }
  }
}

import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import { ICaseRatingRepository } from '../../domain/interfaces/case-rating-repository.interface'
import { CaseRating } from '../../domain/entities/case-rating.entity'

@Injectable()
export class PrismaCaseRatingRepository implements ICaseRatingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndCase(userId: string, caseId: string): Promise<CaseRating | null> {
    const record = await this.prisma.caseRating.findUnique({
      where: { one_rating_per_case: { caseId, userId } },
    })
    return record ? this.toDomain(record) : null
  }

  async create(rating: CaseRating): Promise<CaseRating> {
    const record = await this.prisma.caseRating.create({
      data: {
        caseId: rating.caseId,
        userId: rating.userId,
        score: rating.score,
        issues: rating.issues,
        comment: rating.comment,
        createdAt: rating.createdAt,
      },
    })
    return this.toDomain(record)
  }

  async countByCase(caseId: string): Promise<number> {
    return this.prisma.caseRating.count({ where: { caseId } })
  }

  async avgByCase(caseId: string): Promise<number> {
    const result = await this.prisma.caseRating.aggregate({
      where: { caseId },
      _avg: { score: true },
    })
    return result._avg.score ?? 0
  }

  private toDomain(record: {
    id: string
    caseId: string
    userId: string
    score: number
    issues: string[]
    comment: string | null
    createdAt: Date
  }): CaseRating {
    return CaseRating.create({
      id: record.id,
      caseId: record.caseId,
      userId: record.userId,
      score: record.score,
      issues: record.issues,
      comment: record.comment,
      createdAt: record.createdAt,
    })
  }
}

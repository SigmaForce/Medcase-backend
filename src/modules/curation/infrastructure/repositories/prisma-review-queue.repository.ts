import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import {
  IReviewQueueRepository,
  ListQueueFilters,
  ListQueueResult,
} from '../../domain/interfaces/review-queue-repository.interface'
import { ReviewQueueItem, ReviewQueueStatus } from '../../domain/entities/review-queue-item.entity'
import { Prisma } from '@prisma/client'

@Injectable()
export class PrismaReviewQueueRepository implements IReviewQueueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(item: ReviewQueueItem): Promise<ReviewQueueItem> {
    const record = await this.prisma.caseReviewQueue.create({
      data: {
        caseId: item.caseId,
        status: item.status,
        regenerations: item.regenerations,
        reviewedById: item.reviewedById,
        reviewedAt: item.reviewedAt,
      },
    })
    return this.toDomain(record)
  }

  async findById(id: string): Promise<ReviewQueueItem | null> {
    const record = await this.prisma.caseReviewQueue.findUnique({ where: { id } })
    return record ? this.toDomain(record) : null
  }

  async findByCaseId(caseId: string): Promise<ReviewQueueItem | null> {
    const record = await this.prisma.caseReviewQueue.findFirst({
      where: { caseId, status: { not: 'approved' } },
    })
    return record ? this.toDomain(record) : null
  }

  async list(filters: ListQueueFilters): Promise<ListQueueResult> {
    const where: Prisma.CaseReviewQueueWhereInput = {}
    if (filters.status) {
      where.status = filters.status
    }

    const skip = (filters.page - 1) * filters.limit
    const take = filters.limit

    const [records, total] = await Promise.all([
      this.prisma.caseReviewQueue.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.caseReviewQueue.count({ where }),
    ])

    return {
      data: records.map((r) => this.toDomain(r)),
      meta: { page: filters.page, limit: filters.limit, total },
    }
  }

  async update(item: ReviewQueueItem): Promise<ReviewQueueItem> {
    const record = await this.prisma.caseReviewQueue.update({
      where: { id: item.id },
      data: {
        status: item.status,
        regenerations: item.regenerations,
        reviewedById: item.reviewedById,
        reviewedAt: item.reviewedAt,
      },
    })
    return this.toDomain(record)
  }

  private toDomain(record: {
    id: string
    caseId: string
    status: string
    regenerations: number
    reviewedById: string | null
    reviewedAt: Date | null
    createdAt: Date
    updatedAt: Date
  }): ReviewQueueItem {
    return ReviewQueueItem.create({
      id: record.id,
      caseId: record.caseId,
      status: record.status as ReviewQueueStatus,
      regenerations: record.regenerations,
      reviewedById: record.reviewedById,
      reviewedAt: record.reviewedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
  }
}

import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import {
  IClinicalCaseRepository,
  ListCasesFilters,
  ListCasesResult,
} from '../../domain/interfaces/clinical-case-repository.interface'
import { ClinicalCase } from '../../domain/entities/clinical-case.entity'
import { Prisma } from '@prisma/client'

type PrismaClinicalCaseRecord = {
  id: string
  specialtyId: number
  createdById: string
  reviewedById: string | null
  title: string
  difficulty: string
  language: string
  countryContext: string
  status: string
  caseBrief: Prisma.JsonValue
  availableExams: Prisma.JsonValue
  generationPrompt: string | null
  avgRating: Prisma.Decimal
  totalRatings: number
  flaggedCount: number
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class PrismaClinicalCaseRepository implements IClinicalCaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: ListCasesFilters): Promise<ListCasesResult> {
    const where: Prisma.ClinicalCaseWhereInput = {
      status: 'approved',
      avgRating: { gte: new Prisma.Decimal(2.0) },
    }

    if (filters.specialtyId !== undefined) {
      where.specialtyId = filters.specialtyId
    }

    if (filters.difficulty !== undefined) {
      where.difficulty = filters.difficulty
    }

    if (filters.language !== undefined) {
      where.language = filters.language
    }

    if (filters.country !== undefined) {
      where.countryContext = filters.country
    }

    const skip = (filters.page - 1) * filters.limit
    const take = filters.limit

    const [records, total] = await Promise.all([
      this.prisma.clinicalCase.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { specialty: true },
      }),
      this.prisma.clinicalCase.count({ where }),
    ])

    return {
      data: records.map((r) => this.toDomain(r)),
      meta: { page: filters.page, limit: filters.limit, total },
    }
  }

  async findById(id: string): Promise<ClinicalCase | null> {
    const record = await this.prisma.clinicalCase.findUnique({
      where: { id },
      include: { specialty: true },
    })
    return record ? this.toDomain(record) : null
  }

  async create(clinicalCase: ClinicalCase): Promise<ClinicalCase> {
    const record = await this.prisma.clinicalCase.create({
      data: {
        specialtyId: clinicalCase.specialtyId,
        createdById: clinicalCase.createdById,
        reviewedById: clinicalCase.reviewedById,
        title: clinicalCase.title,
        difficulty: clinicalCase.difficulty,
        language: clinicalCase.language,
        countryContext: clinicalCase.countryContext,
        status: clinicalCase.status,
        caseBrief: clinicalCase.caseBrief as Prisma.InputJsonValue,
        availableExams: clinicalCase.availableExams as Prisma.InputJsonValue,
        generationPrompt: clinicalCase.generationPrompt,
        avgRating: clinicalCase.avgRating,
        totalRatings: clinicalCase.totalRatings,
        flaggedCount: clinicalCase.flaggedCount,
      },
      include: { specialty: true },
    })
    return this.toDomain(record)
  }

  private toDomain(record: PrismaClinicalCaseRecord): ClinicalCase {
    return ClinicalCase.create({
      id: record.id,
      specialtyId: record.specialtyId,
      createdById: record.createdById,
      reviewedById: record.reviewedById,
      title: record.title,
      difficulty: record.difficulty as ClinicalCase['difficulty'],
      language: record.language as ClinicalCase['language'],
      countryContext: record.countryContext as ClinicalCase['countryContext'],
      status: record.status as ClinicalCase['status'],
      caseBrief: record.caseBrief as Record<string, unknown>,
      availableExams: record.availableExams as Record<string, unknown>,
      generationPrompt: record.generationPrompt,
      avgRating: Number(record.avgRating),
      totalRatings: record.totalRatings,
      flaggedCount: record.flaggedCount,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
  }
}

import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../../../infra/database/prisma.service'
import {
  IObjectiveExamRepository,
  ListObjectiveQuestionsFilters,
  ObjectiveQuestionImportInput,
  PerformanceAttemptRecord,
  SimulationSelectionFilters,
} from '../../domain/interfaces/objective-exam-repository.interface'
import { ObjectiveQuestion, ObjectiveAlternative } from '../../domain/entities/objective-question.entity'
import { ObjectiveAttempt, ObjectiveSimulation, ObjectiveSimulationFilters } from '../../domain/entities/objective-simulation.entity'

@Injectable()
export class PrismaObjectiveExamRepository implements IObjectiveExamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findQuestions(filters: ListObjectiveQuestionsFilters): Promise<{ data: ObjectiveQuestion[]; total: number }> {
    const where = this.buildQuestionWhere(filters)
    const skip = (filters.page - 1) * filters.limit

    const [records, total] = await Promise.all([
      this.prisma.objectiveQuestion.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.objectiveQuestion.count({ where }),
    ])

    return { data: records.map((r) => this.mapQuestion(r)), total }
  }

  async findQuestionById(id: string): Promise<ObjectiveQuestion | null> {
    const record = await this.prisma.objectiveQuestion.findUnique({ where: { id } })
    return record ? this.mapQuestion(record) : null
  }

  async findApprovedForSimulation(filters: SimulationSelectionFilters): Promise<ObjectiveQuestion[]> {
    const where: Prisma.ObjectiveQuestionWhereInput = {
      status: 'approved',
      difficulty: { in: filters.difficulty },
      isAnnulled: false,
    }

    if (filters.source !== 'all') {
      where.sourceType = filters.source
    }

    if (filters.specialtyIds.length > 0) {
      where.specialtyId = { in: filters.specialtyIds }
    }

    const records = await this.prisma.objectiveQuestion.findMany({ where })
    return records.map((r) => this.mapQuestion(r))
  }

  async hasUserAnsweredQuestion(userId: string, questionId: string): Promise<boolean> {
    const count = await this.prisma.objectiveAttempt.count({
      where: {
        userId,
        questionId,
        OR: [
          { simulationId: null },
          { simulation: { status: 'completed' } },
        ],
      },
    })
    return count > 0
  }

  async saveStandaloneAttempt(input: {
    userId: string
    questionId: string
    selectedAlternative: string
    isCorrect: boolean
    timeSpentSecs?: number | null
    meta?: Record<string, unknown>
  }): Promise<ObjectiveAttempt> {
    const record = await this.prisma.objectiveAttempt.create({
      data: {
        userId: input.userId,
        questionId: input.questionId,
        selectedAlternative: input.selectedAlternative,
        isCorrect: input.isCorrect,
        timeSpentSecs: input.timeSpentSecs ?? null,
        meta: (input.meta ?? {}) as Prisma.InputJsonValue,
      },
    })
    return this.mapAttempt(record)
  }

  async createSimulation(input: {
    userId: string
    questionCount: number
    filters: ObjectiveSimulationFilters
    questionOrder: string[]
    timedLimitSecs: number
  }): Promise<ObjectiveSimulation> {
    const record = await this.prisma.objectiveSimulation.create({
      data: {
        userId: input.userId,
        questionCount: input.questionCount,
        filters: input.filters as unknown as Prisma.InputJsonValue,
        questionOrder: input.questionOrder,
        timedLimitSecs: input.timedLimitSecs,
        activeElapsedSecs: 0,
      },
    })
    return this.mapSimulation(record)
  }

  async findSimulationById(id: string): Promise<ObjectiveSimulation | null> {
    const record = await this.prisma.objectiveSimulation.findUnique({ where: { id } })
    return record ? this.mapSimulation(record) : null
  }

  async listSimulations(input: { userId: string; page: number; limit: number }): Promise<{ data: ObjectiveSimulation[]; total: number }> {
    const skip = (input.page - 1) * input.limit
    const where = { userId: input.userId }

    const [records, total] = await Promise.all([
      this.prisma.objectiveSimulation.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.objectiveSimulation.count({ where }),
    ])

    return { data: records.map((r) => this.mapSimulation(r)), total }
  }

  async findQuestionsByIds(ids: string[]): Promise<ObjectiveQuestion[]> {
    if (ids.length === 0) return []
    const records = await this.prisma.objectiveQuestion.findMany({
      where: { id: { in: ids } },
    })
    const byId = new Map(records.map((r) => [r.id, this.mapQuestion(r)]))
    return ids.map((id) => byId.get(id)).filter((q): q is ObjectiveQuestion => q !== undefined)
  }

  async findAttemptsBySimulation(simulationId: string): Promise<ObjectiveAttempt[]> {
    const records = await this.prisma.objectiveAttempt.findMany({
      where: { simulationId },
      orderBy: { answeredAt: 'asc' },
    })
    return records.map((r) => this.mapAttempt(r))
  }

  async saveSimulationAttempt(input: {
    userId: string
    simulationId: string
    questionId: string
    selectedAlternative: string
    isCorrect: boolean
    timeSpentSecs?: number | null
    meta?: Record<string, unknown>
  }): Promise<ObjectiveAttempt> {
    const existing = await this.prisma.objectiveAttempt.findFirst({
      where: { simulationId: input.simulationId, questionId: input.questionId },
    })

    const data = {
      selectedAlternative: input.selectedAlternative,
      isCorrect: input.isCorrect,
      timeSpentSecs: input.timeSpentSecs ?? null,
      meta: (input.meta ?? {}) as Prisma.InputJsonValue,
      answeredAt: new Date(),
    }

    const record = existing
      ? await this.prisma.objectiveAttempt.update({ where: { id: existing.id }, data })
      : await this.prisma.objectiveAttempt.create({
          data: {
            userId: input.userId,
            questionId: input.questionId,
            simulationId: input.simulationId,
            ...data,
          },
        })

    return this.mapAttempt(record)
  }

  async completeSimulation(input: {
    simulationId: string
    scoreTotal: number
    scorePercent: number
    durationSecs: number
    completedAt: Date
    activeElapsedSecs?: number | null
  }): Promise<ObjectiveSimulation> {
    const record = await this.prisma.objectiveSimulation.update({
      where: { id: input.simulationId },
      data: {
        status: 'completed',
        scoreTotal: input.scoreTotal,
        scorePercent: input.scorePercent,
        durationSecs: input.durationSecs,
        completedAt: input.completedAt,
        ...(input.activeElapsedSecs !== undefined ? { activeElapsedSecs: input.activeElapsedSecs } : {}),
      },
    })
    return this.mapSimulation(record)
  }

  async updateSimulationActiveElapsed(input: {
    simulationId: string
    activeElapsedSecs: number
  }): Promise<ObjectiveSimulation> {
    const record = await this.prisma.objectiveSimulation.update({
      where: { id: input.simulationId },
      data: { activeElapsedSecs: input.activeElapsedSecs },
    })
    return this.mapSimulation(record)
  }

  async upsertQuestion(
    input: ObjectiveQuestionImportInput,
    createdById?: string | null,
  ): Promise<{ question: ObjectiveQuestion; created: boolean }> {
    const existing = await this.prisma.objectiveQuestion.findUnique({
      where: { externalId: input.externalId },
    })

    const data = {
      specialtyId: input.specialtyId ?? null,
      createdById: existing?.createdById ?? createdById ?? null,
      stem: input.stem,
      alternatives: input.alternatives as unknown as Prisma.InputJsonValue,
      correctAlternative: input.correctAlternative,
      explanation: input.explanation ?? null,
      difficulty: input.difficulty,
      status: input.status ?? 'approved',
      sourceType: input.sourceType,
      sourceLabel: input.sourceLabel,
      year: input.year ?? null,
      edition: input.edition ?? null,
      externalId: input.externalId,
      sourceUrl: input.sourceUrl ?? null,
      tags: input.tags ?? [],
      isAnnulled: input.isAnnulled ?? false,
    }

    const record = existing
      ? await this.prisma.objectiveQuestion.update({ where: { externalId: input.externalId }, data })
      : await this.prisma.objectiveQuestion.create({ data })

    return { question: this.mapQuestion(record), created: !existing }
  }

  async findPerformanceAttempts(userId: string): Promise<PerformanceAttemptRecord[]> {
    const records = await this.prisma.objectiveAttempt.findMany({
      where: {
        userId,
        OR: [
          { simulationId: null },
          { simulation: { status: 'completed' } },
        ],
      },
      include: { question: true },
      orderBy: { answeredAt: 'desc' },
    })

    return records.map((r) => ({
      ...this.mapAttempt(r),
      question: {
        specialtyId: r.question.specialtyId,
        difficulty: r.question.difficulty as PerformanceAttemptRecord['question']['difficulty'],
        sourceType: r.question.sourceType as PerformanceAttemptRecord['question']['sourceType'],
        tags: r.question.tags,
      },
    }))
  }

  private buildQuestionWhere(filters: ListObjectiveQuestionsFilters): Prisma.ObjectiveQuestionWhereInput {
    const where: Prisma.ObjectiveQuestionWhereInput = { status: 'approved' }

    if (filters.specialtyId !== undefined) {
      where.specialtyId = filters.specialtyId
    }
    if (filters.difficulty !== undefined) {
      where.difficulty = filters.difficulty
    }
    if (filters.source !== undefined && filters.source !== 'all') {
      where.sourceType = filters.source
    }
    if (filters.year !== undefined) {
      where.year = filters.year
    }
    if (filters.edition !== undefined) {
      where.edition = filters.edition
    }
    if (filters.tag !== undefined) {
      where.tags = { has: filters.tag }
    }

    return where
  }

  private mapQuestion(record: {
    id: string
    specialtyId: number | null
    createdById: string | null
    stem: string
    alternatives: Prisma.JsonValue
    correctAlternative: string
    explanation: string | null
    difficulty: string
    status: string
    sourceType: string
    sourceLabel: string
    year: number | null
    edition: string | null
    externalId: string
    sourceUrl: string | null
    tags: string[]
    isAnnulled: boolean
    createdAt: Date
    updatedAt: Date
  }): ObjectiveQuestion {
    return {
      id: record.id,
      specialtyId: record.specialtyId,
      createdById: record.createdById,
      stem: record.stem,
      alternatives: record.alternatives as unknown as ObjectiveQuestion['alternatives'],
      correctAlternative: record.correctAlternative as ObjectiveQuestion['correctAlternative'],
      explanation: record.explanation,
      difficulty: record.difficulty as ObjectiveQuestion['difficulty'],
      status: record.status as ObjectiveQuestion['status'],
      sourceType: record.sourceType as ObjectiveQuestion['sourceType'],
      sourceLabel: record.sourceLabel,
      year: record.year,
      edition: record.edition,
      externalId: record.externalId,
      sourceUrl: record.sourceUrl,
      tags: record.tags,
      isAnnulled: record.isAnnulled,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
  }

  private mapSimulation(record: {
    id: string
    userId: string
    status: string
    questionCount: number
    filters: Prisma.JsonValue
    questionOrder: string[]
    timedLimitSecs: number
    scoreTotal: number | null
    scorePercent: Prisma.Decimal | null
    startedAt: Date
    completedAt: Date | null
    durationSecs: number | null
    activeElapsedSecs: number | null
  }): ObjectiveSimulation {
    return {
      id: record.id,
      userId: record.userId,
      status: record.status as ObjectiveSimulation['status'],
      questionCount: record.questionCount,
      filters: record.filters as unknown as ObjectiveSimulation['filters'],
      questionOrder: record.questionOrder,
      timedLimitSecs: record.timedLimitSecs,
      scoreTotal: record.scoreTotal,
      scorePercent: record.scorePercent === null ? null : Number(record.scorePercent),
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      durationSecs: record.durationSecs,
      activeElapsedSecs: record.activeElapsedSecs,
    }
  }

  private mapAttempt(record: {
    id: string
    userId: string
    questionId: string
    simulationId: string | null
    selectedAlternative: string
    isCorrect: boolean
    timeSpentSecs: number | null
    meta: Prisma.JsonValue
    answeredAt: Date
  }): ObjectiveAttempt {
    return {
      id: record.id,
      userId: record.userId,
      questionId: record.questionId,
      simulationId: record.simulationId,
      selectedAlternative: record.selectedAlternative,
      isCorrect: record.isCorrect,
      timeSpentSecs: record.timeSpentSecs,
      meta: record.meta as Record<string, unknown>,
      answeredAt: record.answeredAt,
    }
  }
}

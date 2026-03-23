import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import {
  ISessionRepository,
  SessionListFilters,
  SessionListResult,
  ClinicalCaseRecord,
  SubscriptionRecord,
  FeedbackData,
} from '../../domain/interfaces/session-repository.interface'
import { ClinicalSession } from '../../domain/entities/clinical-session.entity'
import { MessageTurn } from '../../domain/entities/message-turn.entity'
import { Prisma } from '@prisma/client'

@Injectable()
export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(session: ClinicalSession): Promise<ClinicalSession> {
    const record = await this.prisma.session.create({
      data: {
        userId: session.userId,
        caseId: session.caseId,
        status: session.status,
        isTimed: session.isTimed,
        timedLimitSecs: session.timedLimitSecs,
        requestedExams: session.requestedExams,
        missedKeyExams: session.missedKeyExams,
      },
    })
    return this.mapSession(record)
  }

  async findById(id: string): Promise<ClinicalSession | null> {
    const record = await this.prisma.session.findUnique({ where: { id } })
    if (!record) return null
    return this.mapSession(record)
  }

  async findByUserAndCase(userId: string, caseId: string): Promise<ClinicalSession | null> {
    const record = await this.prisma.session.findFirst({
      where: { userId, caseId },
    })
    if (!record) return null
    return this.mapSession(record)
  }

  async findInProgressByUserAndCase(userId: string, caseId: string): Promise<ClinicalSession | null> {
    const record = await this.prisma.session.findFirst({
      where: { userId, caseId, status: 'in_progress' },
    })
    if (!record) return null
    return this.mapSession(record)
  }

  async findByUser(userId: string, filters: SessionListFilters): Promise<SessionListResult> {
    const where: Prisma.SessionWhereInput = { userId }

    if (filters.status) {
      where.status = filters.status as 'in_progress' | 'completed' | 'abandoned'
    }

    const skip = (filters.page - 1) * filters.limit

    const [records, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.session.count({ where }),
    ])

    return {
      sessions: records.map((r) => this.mapSession(r)),
      total,
    }
  }

  async update(session: ClinicalSession): Promise<ClinicalSession> {
    const record = await this.prisma.session.update({
      where: { id: session.id },
      data: {
        status: session.status,
        submittedDiagnosis: session.submittedDiagnosis,
        submittedManagement: session.submittedManagement,
        feedback: session.feedback !== null
          ? (session.feedback as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        requestedExams: session.requestedExams,
        missedKeyExams: session.missedKeyExams,
        completedAt: session.completedAt,
        durationSecs: session.durationSecs,
      },
    })
    return this.mapSession(record)
  }

  async addMessage(message: MessageTurn): Promise<MessageTurn> {
    const record = await this.prisma.message.create({
      data: {
        sessionId: message.sessionId,
        role: message.role,
        content: message.content,
        meta: message.meta as Prisma.InputJsonValue,
      },
    })
    return this.mapMessage(record)
  }

  async getMessages(sessionId: string): Promise<MessageTurn[]> {
    const records = await this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })
    return records.map((r) => this.mapMessage(r))
  }

  async countMessages(sessionId: string): Promise<number> {
    return this.prisma.message.count({ where: { sessionId } })
  }

  async updateRequestedExams(sessionId: string, slugs: string[]): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { requestedExams: slugs },
    })
  }

  async findCaseById(caseId: string): Promise<ClinicalCaseRecord | null> {
    const record = await this.prisma.clinicalCase.findUnique({
      where: { id: caseId },
    })
    if (!record) return null
    return {
      id: record.id,
      status: record.status,
      specialtyId: record.specialtyId,
      caseBrief: record.caseBrief as Record<string, unknown>,
      availableExams: record.availableExams as Record<string, unknown>,
    }
  }

  async getSubscription(userId: string): Promise<SubscriptionRecord | null> {
    const record = await this.prisma.subscription.findUnique({ where: { userId } })
    if (!record) return null
    return {
      plan: record.plan,
      casesLimit: record.casesLimit,
      casesUsed: record.casesUsed,
      usageResetAt: record.usageResetAt,
    }
  }

  async incrementCasesUsed(userId: string): Promise<void> {
    await this.prisma.subscription.update({
      where: { userId },
      data: { casesUsed: { increment: 1 } },
    })
  }

  async upsertPerformance({
    userId,
    specialtyId,
    feedback,
  }: {
    userId: string
    specialtyId: number
    feedback: FeedbackData
  }): Promise<void> {
    const existing = await this.prisma.studentPerformance.findUnique({
      where: { unique_perf: { userId, specialtyId } },
    })

    if (!existing) {
      await this.prisma.studentPerformance.create({
        data: {
          userId,
          specialtyId,
          totalSessions: 1,
          avgScoreTotal: feedback.scoreTotal,
          avgHistoryTaking: feedback.dimensions.history_taking.score,
          avgDifferential: feedback.dimensions.differential.score,
          avgDiagnosis: feedback.dimensions.diagnosis.score,
          avgExams: feedback.dimensions.exams.score,
          avgManagement: feedback.dimensions.management.score,
          lastSessionAt: new Date(),
        },
      })
    } else {
      const isImprovement = feedback.scoreTotal > Number(existing.avgScoreTotal)

      await this.prisma.studentPerformance.update({
        where: { unique_perf: { userId, specialtyId } },
        data: {
          totalSessions: { increment: 1 },
          lastSessionAt: new Date(),
          ...(isImprovement
            ? {
                avgScoreTotal: feedback.scoreTotal,
                avgHistoryTaking: feedback.dimensions.history_taking.score,
                avgDifferential: feedback.dimensions.differential.score,
                avgDiagnosis: feedback.dimensions.diagnosis.score,
                avgExams: feedback.dimensions.exams.score,
                avgManagement: feedback.dimensions.management.score,
              }
            : {}),
        },
      })
    }
  }

  private mapSession(
    record: {
      id: string
      userId: string
      caseId: string
      status: string
      submittedDiagnosis: string | null
      submittedManagement: string | null
      feedback: unknown
      requestedExams: string[]
      missedKeyExams: string[]
      startedAt: Date
      completedAt: Date | null
      durationSecs: number | null
      isTimed: boolean
      timedLimitSecs: number
    },
  ): ClinicalSession {
    return ClinicalSession.create({
      id: record.id,
      userId: record.userId,
      caseId: record.caseId,
      status: record.status as 'in_progress' | 'completed' | 'abandoned',
      submittedDiagnosis: record.submittedDiagnosis,
      submittedManagement: record.submittedManagement,
      feedback:
        record.feedback !== null
          ? (record.feedback as Record<string, unknown>)
          : null,
      requestedExams: record.requestedExams,
      missedKeyExams: record.missedKeyExams,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      durationSecs: record.durationSecs,
      isTimed: record.isTimed,
      timedLimitSecs: record.timedLimitSecs,
    })
  }

  async findCompletedByUserAndCase(userId: string, caseId: string): Promise<boolean> {
    const count = await this.prisma.session.count({
      where: { userId, caseId, status: 'completed' },
    })
    return count > 0
  }

  private mapMessage(record: {
    id: string
    sessionId: string
    role: string
    content: string
    meta: unknown
    createdAt: Date
  }): MessageTurn {
    return MessageTurn.create({
      id: record.id,
      sessionId: record.sessionId,
      role: record.role as 'user' | 'assistant' | 'system',
      content: record.content,
      meta: record.meta as Record<string, unknown>,
      createdAt: record.createdAt,
    })
  }
}

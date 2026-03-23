import { Injectable } from '@nestjs/common'
import dayjs from 'dayjs'
import { PrismaService } from '../../../../infra/database/prisma.service'
import {
  IUsageMetricsRepository,
  PeriodStats,
  SaveMetricParams,
} from '../../domain/interfaces/usage-metrics-repository.interface'
import { UsageMetric } from '../../domain/entities/usage-metric.entity'
import { calculateCostUsd, usdToBrl } from '../../domain/utils/cost-calculator'

@Injectable()
export class PrismaUsageMetricsRepository implements IUsageMetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(params: SaveMetricParams): Promise<UsageMetric> {
    const record = await this.prisma.usageMetric.create({
      data: {
        sessionId: params.sessionId ?? null,
        userId: params.userId,
        operation: params.operation,
        model: params.model,
        tokensInput: params.tokensInput,
        tokensOutput: params.tokensOutput,
        latencyMs: params.latencyMs ?? null,
      },
    })
    return this.toDomain(record)
  }

  async getStats(from: Date, to: Date): Promise<PeriodStats> {
    return this.computeStats(from, to)
  }

  async getDailyStats(date: Date): Promise<PeriodStats> {
    const start = dayjs(date).startOf('day').toDate()
    const end = dayjs(date).endOf('day').toDate()
    return this.computeStats(start, end)
  }

  private async computeStats(from: Date, to: Date): Promise<PeriodStats> {
    const records = await this.prisma.usageMetric.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { operation: true, model: true, tokensInput: true, tokensOutput: true, sessionId: true },
    })

    const sessionIds = new Set(records.filter((r) => r.sessionId).map((r) => r.sessionId!))
    const sessions = sessionIds.size

    const byOperation: Record<string, { tokens: number; usd: number }> = {}
    let totalInput = 0
    let totalOutput = 0
    let totalUsd = 0

    for (const r of records) {
      const usd = calculateCostUsd(r.model, r.tokensInput, r.tokensOutput)
      const op = byOperation[r.operation] ?? { tokens: 0, usd: 0 }
      op.tokens += r.tokensInput + r.tokensOutput
      op.usd += usd
      byOperation[r.operation] = op
      totalInput += r.tokensInput
      totalOutput += r.tokensOutput
      totalUsd += usd
    }

    const estimatedUsd = Math.round(totalUsd * 100) / 100
    const estimatedBrl = usdToBrl(totalUsd)
    const costPerSession = sessions > 0 ? Math.round((totalUsd / sessions) * 1000) / 1000 : 0

    for (const key of Object.keys(byOperation)) {
      byOperation[key].usd = Math.round(byOperation[key].usd * 100) / 100
    }

    return { sessions, tokensInput: totalInput, tokensOutput: totalOutput, estimatedUsd, estimatedBrl, costPerSession, byOperation }
  }

  private toDomain(record: {
    id: string
    sessionId: string | null
    userId: string
    operation: string
    model: string
    tokensInput: number
    tokensOutput: number
    latencyMs: number | null
    createdAt: Date
  }): UsageMetric {
    const m = new UsageMetric()
    m.id = record.id
    m.sessionId = record.sessionId
    m.userId = record.userId
    m.operation = record.operation as UsageMetric['operation']
    m.model = record.model
    m.tokensInput = record.tokensInput
    m.tokensOutput = record.tokensOutput
    m.latencyMs = record.latencyMs
    m.createdAt = record.createdAt
    return m
  }
}

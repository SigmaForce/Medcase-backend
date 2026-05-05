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
    const [totals] = await this.prisma.$queryRaw<Array<{
      sessions: bigint
      tokens_input: bigint
      tokens_output: bigint
    }>>`
      SELECT
        COUNT(DISTINCT session_id)        AS sessions,
        COALESCE(SUM(tokens_input),  0)   AS tokens_input,
        COALESCE(SUM(tokens_output), 0)   AS tokens_output
      FROM usage_metrics
      WHERE created_at BETWEEN ${from} AND ${to}
    `

    const byOpRows = await this.prisma.$queryRaw<Array<{
      operation: string
      model: string
      tokens_input: bigint
      tokens_output: bigint
    }>>`
      SELECT
        operation,
        model,
        COALESCE(SUM(tokens_input),  0) AS tokens_input,
        COALESCE(SUM(tokens_output), 0) AS tokens_output
      FROM usage_metrics
      WHERE created_at BETWEEN ${from} AND ${to}
      GROUP BY operation, model
    `

    const sessions    = Number(totals?.sessions ?? 0)
    const totalInput  = Number(totals?.tokens_input ?? 0)
    const totalOutput = Number(totals?.tokens_output ?? 0)

    const byOperation: Record<string, { tokens: number; usd: number }> = {}
    let totalUsd = 0

    for (const row of byOpRows) {
      const input  = Number(row.tokens_input)
      const output = Number(row.tokens_output)
      const usd    = calculateCostUsd(row.model, input, output)
      const op     = byOperation[row.operation] ?? { tokens: 0, usd: 0 }
      op.tokens   += input + output
      op.usd      += usd
      byOperation[row.operation] = op
      totalUsd += usd
    }

    for (const key of Object.keys(byOperation)) {
      byOperation[key].usd = Math.round(byOperation[key].usd * 100) / 100
    }

    const estimatedUsd   = Math.round(totalUsd * 100) / 100
    const estimatedBrl   = usdToBrl(totalUsd)
    const costPerSession = sessions > 0 ? Math.round((totalUsd / sessions) * 1000) / 1000 : 0

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

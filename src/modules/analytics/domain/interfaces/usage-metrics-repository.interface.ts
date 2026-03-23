import { UsageMetric, MetricOperation } from '../entities/usage-metric.entity'

export interface SaveMetricParams {
  sessionId?: string | null
  userId: string
  operation: MetricOperation
  model: string
  tokensInput: number
  tokensOutput: number
  latencyMs?: number | null
}

export interface OperationStats {
  tokens: number
  usd: number
}

export interface PeriodStats {
  sessions: number
  tokensInput: number
  tokensOutput: number
  estimatedUsd: number
  estimatedBrl: number
  costPerSession: number
  byOperation: Record<string, OperationStats>
}

export interface IUsageMetricsRepository {
  save(params: SaveMetricParams): Promise<UsageMetric>
  getStats(from: Date, to: Date): Promise<PeriodStats>
  getDailyStats(date: Date): Promise<PeriodStats>
}

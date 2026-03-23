import { Inject, Injectable } from '@nestjs/common'
import dayjs from 'dayjs'
import { IUsageMetricsRepository } from '../../domain/interfaces/usage-metrics-repository.interface'

export interface GetAdminCostsInput {
  from: string
  to: string
}

export interface GetAdminCostsOutput {
  period: { from: string; to: string }
  totals: {
    sessions: number
    tokens_input: number
    tokens_output: number
    estimated_usd: number
    estimated_brl: number
    cost_per_session: number
  }
  by_operation: Record<string, { tokens: number; usd: number }>
  alert: { status: string; message: string }
}

@Injectable()
export class GetAdminCosts {
  constructor(
    @Inject('IUsageMetricsRepository')
    private readonly usageMetricsRepo: IUsageMetricsRepository,
  ) {}

  async execute({ from, to }: GetAdminCostsInput): Promise<GetAdminCostsOutput> {
    const fromDate = dayjs(from).startOf('day').toDate()
    const toDate = dayjs(to).endOf('day').toDate()

    const stats = await this.usageMetricsRepo.getStats(fromDate, toDate)

    const targetCostPerSession = 0.07
    const alertStatus = stats.costPerSession > targetCostPerSession ? 'warning' : 'ok'
    const alertMessage =
      alertStatus === 'ok'
        ? `Dentro da meta ($${targetCostPerSession.toFixed(2)}/sessão)`
        : `Acima da meta — $${stats.costPerSession.toFixed(3)}/sessão`

    return {
      period: { from, to },
      totals: {
        sessions: stats.sessions,
        tokens_input: stats.tokensInput,
        tokens_output: stats.tokensOutput,
        estimated_usd: stats.estimatedUsd,
        estimated_brl: stats.estimatedBrl,
        cost_per_session: stats.costPerSession,
      },
      by_operation: stats.byOperation,
      alert: { status: alertStatus, message: alertMessage },
    }
  }
}

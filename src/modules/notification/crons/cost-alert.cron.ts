import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import dayjs from 'dayjs'
import { IUsageMetricsRepository } from '../../analytics/domain/interfaces/usage-metrics-repository.interface'
import { NotificationEmailService } from '../infrastructure/services/notification-email.service'
import { env } from '../../../config/env'

const COST_THRESHOLD_USD = 0.10

@Injectable()
export class CostAlertCron {
  private readonly logger = new Logger(CostAlertCron.name)

  constructor(
    @Inject('IUsageMetricsRepository')
    private readonly usageMetricsRepo: IUsageMetricsRepository,
    private readonly emailService: NotificationEmailService,
  ) {}

  @Cron('0 8 * * *')
  async checkDailyCosts(): Promise<void> {
    try {
      const yesterday = dayjs().subtract(1, 'day').toDate()
      const stats = await this.usageMetricsRepo.getDailyStats(yesterday)

      if (stats.sessions === 0) return

      if (stats.costPerSession > COST_THRESHOLD_USD) {
        await this.emailService.send({
          to: env.ADMIN_EMAIL,
          template: 'cost-alert',
          data: {
            cost_per_session: stats.costPerSession.toFixed(3),
            total_usd: stats.estimatedUsd.toFixed(2),
          },
        })
        this.logger.warn(`Alerta de custo: $${stats.costPerSession.toFixed(3)}/sessão — total $${stats.estimatedUsd.toFixed(2)}`)
      }
    } catch (err) {
      this.logger.error('Falha no cron de alerta de custo', { error: err })
    }
  }
}

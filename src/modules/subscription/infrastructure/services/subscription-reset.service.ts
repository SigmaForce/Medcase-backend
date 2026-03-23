import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ISubscriptionRepository } from '../../domain/interfaces/subscription-repository.interface'

@Injectable()
export class SubscriptionResetService {
  private readonly logger = new Logger(SubscriptionResetService.name)

  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetExpiredUsage(): Promise<void> {
    const subscriptions = await this.subscriptionRepo.findDueForReset()

    if (subscriptions.length === 0) return

    await Promise.all(subscriptions.map((sub) => this.subscriptionRepo.resetUsage(sub.userId)))

    this.logger.log(`Resetadas ${subscriptions.length} assinatura(s) com uso expirado`)
  }
}

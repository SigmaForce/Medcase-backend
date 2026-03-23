import { Inject, Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { ISubscriptionRepository } from '../../../subscription/domain/interfaces/subscription-repository.interface'
import { NotificationEmailService } from '../../infrastructure/services/notification-email.service'
import { SubscriptionUpgradedEvent } from '../../../subscription/domain/events/subscription-upgraded.event'

@Injectable()
export class SubscriptionUpgradedListener {
  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly emailService: NotificationEmailService,
  ) {}

  @OnEvent('subscription.upgraded')
  async handle(event: SubscriptionUpgradedEvent): Promise<void> {
    const user = await this.subscriptionRepo.findUserById(event.userId)
    const sub = await this.subscriptionRepo.findByUserId(event.userId)
    if (!user) return

    const price = event.provider === 'stripe' ? 'R$ 89,00' : 'PYG 149.000'
    const nextBillingDate =
      sub?.currentPeriodEnd?.toLocaleDateString('pt-BR') ?? sub?.trialEndsAt?.toLocaleDateString('pt-BR') ?? ''

    await this.emailService.send({
      to: user.email,
      template: 'upgrade-confirmed',
      data: {
        first_name: user.fullName.split(' ')[0],
        next_billing_date: nextBillingDate,
        price,
      },
    })
  }
}

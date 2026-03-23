import { Inject, Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { ISubscriptionRepository } from '../../../subscription/domain/interfaces/subscription-repository.interface'
import { NotificationEmailService } from '../../infrastructure/services/notification-email.service'
import { SubscriptionDowngradedEvent } from '../../../subscription/domain/events/subscription-downgraded.event'

@Injectable()
export class SubscriptionDowngradedListener {
  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly emailService: NotificationEmailService,
  ) {}

  @OnEvent('subscription.downgraded')
  async handle(event: SubscriptionDowngradedEvent): Promise<void> {
    const user = await this.subscriptionRepo.findUserById(event.userId)
    if (!user) return

    await this.emailService.send({
      to: user.email,
      template: 'downgraded',
      data: { first_name: user.fullName.split(' ')[0] },
    })
  }
}

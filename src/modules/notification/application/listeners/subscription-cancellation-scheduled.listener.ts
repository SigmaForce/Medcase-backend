import { Inject, Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import dayjs from 'dayjs'
import { ISubscriptionRepository } from '../../../subscription/domain/interfaces/subscription-repository.interface'
import { NotificationEmailService } from '../../infrastructure/services/notification-email.service'
import { SubscriptionCancellationScheduledEvent } from '../../../subscription/domain/events/subscription-cancellation-scheduled.event'

@Injectable()
export class SubscriptionCancellationScheduledListener {
  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly emailService: NotificationEmailService,
  ) {}

  @OnEvent('subscription.cancellation.scheduled')
  async handle(event: SubscriptionCancellationScheduledEvent): Promise<void> {
    const user = await this.subscriptionRepo.findUserById(event.userId)
    if (!user) return

    await this.emailService.send({
      to: user.email,
      template: 'cancellation-scheduled',
      data: {
        first_name: user.fullName.split(' ')[0],
        cancel_at: dayjs(event.cancelAt).format('DD/MM/YYYY'),
      },
    })
  }
}

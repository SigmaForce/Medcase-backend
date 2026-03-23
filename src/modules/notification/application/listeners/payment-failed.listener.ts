import { Inject, Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import dayjs from 'dayjs'
import { ISubscriptionRepository } from '../../../subscription/domain/interfaces/subscription-repository.interface'
import { NotificationEmailService } from '../../infrastructure/services/notification-email.service'
import { PaymentFailedEvent } from '../../../subscription/domain/events/payment-failed.event'
import { env } from '../../../../config/env'

@Injectable()
export class PaymentFailedListener {
  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly emailService: NotificationEmailService,
  ) {}

  @OnEvent('payment.failed')
  async handle(event: PaymentFailedEvent): Promise<void> {
    const user = await this.subscriptionRepo.findUserById(event.userId)
    if (!user) return

    const retryDate = dayjs().add(3, 'day').toDate().toLocaleDateString('pt-BR')
    const portalUrl = `${env.APP_URL}/billing`

    await this.emailService.send({
      to: user.email,
      template: 'payment-failed',
      data: {
        first_name: user.fullName.split(' ')[0],
        retry_date: retryDate,
        portal_url: portalUrl,
      },
    })
  }
}

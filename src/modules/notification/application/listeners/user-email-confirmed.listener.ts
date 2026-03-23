import { Inject, Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { ISubscriptionRepository } from '../../../subscription/domain/interfaces/subscription-repository.interface'
import { NotificationEmailService } from '../../infrastructure/services/notification-email.service'

@Injectable()
export class UserEmailConfirmedListener {
  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly emailService: NotificationEmailService,
  ) {}

  @OnEvent('user.email_confirmed')
  async handle(event: { userId: string }): Promise<void> {
    const user = await this.subscriptionRepo.findUserById(event.userId)
    const sub = await this.subscriptionRepo.findByUserId(event.userId)
    if (!user) return

    await this.emailService.send({
      to: user.email,
      template: 'welcome',
      data: {
        first_name: user.fullName.split(' ')[0],
        cases_limit: sub?.casesLimit ?? 5,
      },
    })
  }
}

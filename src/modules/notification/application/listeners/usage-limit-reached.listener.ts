import { Inject, Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { ISubscriptionRepository } from '../../../subscription/domain/interfaces/subscription-repository.interface'
import { NotificationEmailService } from '../../infrastructure/services/notification-email.service'

@Injectable()
export class UsageLimitReachedListener {
  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly emailService: NotificationEmailService,
  ) {}

  @OnEvent('usage_limit.reached')
  async handle(event: { userId: string }): Promise<void> {
    const user = await this.subscriptionRepo.findUserById(event.userId)
    const sub = await this.subscriptionRepo.findByUserId(event.userId)
    if (!user) return

    await this.emailService.send({
      to: user.email,
      template: 'limit-reached',
      data: {
        first_name: user.fullName.split(' ')[0],
        reset_date: sub?.usageResetAt?.toLocaleDateString('pt-BR') ?? '',
      },
    })
  }
}

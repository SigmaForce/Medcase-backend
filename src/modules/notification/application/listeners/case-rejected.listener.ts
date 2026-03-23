import { Inject, Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { ISubscriptionRepository } from '../../../subscription/domain/interfaces/subscription-repository.interface'
import { NotificationEmailService } from '../../infrastructure/services/notification-email.service'

export interface CaseRejectedPayload {
  userId: string
  caseId: string
  caseTitle: string
  rejectionReason: string
}

@Injectable()
export class CaseRejectedListener {
  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly emailService: NotificationEmailService,
  ) {}

  @OnEvent('case.rejected')
  async handle(event: CaseRejectedPayload): Promise<void> {
    const user = await this.subscriptionRepo.findUserById(event.userId)
    if (!user) return

    await this.emailService.send({
      to: user.email,
      template: 'case-rejected',
      data: {
        first_name: user.fullName.split(' ')[0],
        case_title: event.caseTitle,
        rejection_reason: event.rejectionReason,
      },
    })
  }
}

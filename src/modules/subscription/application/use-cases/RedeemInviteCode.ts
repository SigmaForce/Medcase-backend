import { Inject, Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import dayjs from 'dayjs'
import { DomainException } from '../../../../errors/domain-exception'
import { ISubscriptionRepository } from '../../domain/interfaces/subscription-repository.interface'
import { IInviteCodeRepository } from '../../domain/interfaces/invite-code-repository.interface'
import { SubscriptionUpgradedEvent } from '../../domain/events/subscription-upgraded.event'
import { redeemInviteSchema, RedeemInviteDto } from '../dtos/redeem-invite.dto'

export interface RedeemInviteCodeInput {
  userId: string
  body: unknown
}

export interface RedeemInviteCodeOutput {
  plan: string
  trial_ends_at: Date
  cases_limit: number
  generations_limit: number
}

@Injectable()
export class RedeemInviteCode {
  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject('IInviteCodeRepository')
    private readonly inviteCodeRepo: IInviteCodeRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute({ userId, body }: RedeemInviteCodeInput): Promise<RedeemInviteCodeOutput> {
    const dto = redeemInviteSchema.parse(body) as RedeemInviteDto

    const inviteCode = await this.inviteCodeRepo.findValid(dto.code)
    if (!inviteCode) throw new DomainException('INVITE_CODE_INVALID', 400)

    const subscription = await this.subscriptionRepo.findByUserId(userId)
    if (!subscription) throw new DomainException('SUBSCRIPTION_NOT_FOUND', 404)

    if (subscription.plan === 'pro' && subscription.status === 'active') {
      throw new DomainException('ALREADY_PRO', 409)
    }

    const trialEndsAt = dayjs().add(inviteCode.trialDays, 'day').toDate()

    subscription.upgradeToPro({
      plan: 'pro',
      status: 'trial',
      provider: 'invite',
      externalSubId: inviteCode.code,
      externalCustomer: '',
    })
    subscription.trialEndsAt = trialEndsAt

    await this.subscriptionRepo.update(subscription)
    await this.inviteCodeRepo.markAsUsed(inviteCode.id, userId)

    this.eventEmitter.emit('subscription.upgraded', new SubscriptionUpgradedEvent(userId, 'invite', true))

    return {
      plan: subscription.plan,
      trial_ends_at: trialEndsAt,
      cases_limit: subscription.casesLimit,
      generations_limit: subscription.generationsLimit,
    }
  }
}

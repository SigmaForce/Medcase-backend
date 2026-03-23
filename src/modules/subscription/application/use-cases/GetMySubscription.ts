import { Inject, Injectable } from '@nestjs/common'
import { DomainException } from '../../../../errors/domain-exception'
import { ISubscriptionRepository } from '../../domain/interfaces/subscription-repository.interface'
import { Subscription } from '../../domain/entities/subscription.entity'

export interface GetMySubscriptionInput {
  userId: string
}

export interface GetMySubscriptionOutput {
  plan: string
  status: string
  provider: string | null
  casesUsed: number
  casesLimit: number
  generationsUsed: number
  generationsLimit: number
  usageResetAt: Date
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  trialEndsAt: Date | null
}

@Injectable()
export class GetMySubscription {
  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepo: ISubscriptionRepository,
  ) {}

  async execute({ userId }: GetMySubscriptionInput): Promise<GetMySubscriptionOutput> {
    const sub = await this.subscriptionRepo.findByUserId(userId)
    if (!sub) throw new DomainException('SUBSCRIPTION_NOT_FOUND', 404)
    return this.toOutput(sub)
  }

  private toOutput(sub: Subscription): GetMySubscriptionOutput {
    return {
      plan: sub.plan,
      status: sub.status,
      provider: sub.provider,
      casesUsed: sub.casesUsed,
      casesLimit: sub.casesLimit,
      generationsUsed: sub.generationsUsed,
      generationsLimit: sub.generationsLimit,
      usageResetAt: sub.usageResetAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      trialEndsAt: sub.trialEndsAt,
    }
  }
}

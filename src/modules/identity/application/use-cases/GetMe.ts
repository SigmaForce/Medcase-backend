import { Inject, Injectable } from '@nestjs/common'
import { IUserRepository } from '../../domain/interfaces/user-repository.interface'
import { ISubscriptionRepository } from '../../../subscription/domain/interfaces/subscription-repository.interface'
import { DomainException } from '../../../../errors/domain-exception'
import { UserResponseDto } from '../dtos/user-response.dto'

@Injectable()
export class GetMe {
  constructor(
    @Inject('IUserRepository') private readonly userRepo: IUserRepository,
    @Inject('ISubscriptionRepository') private readonly subscriptionRepo: ISubscriptionRepository,
  ) {}

  async execute(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new DomainException('USER_NOT_FOUND', 404)

    const subscription = await this.subscriptionRepo.findByUserId(userId)

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      country: user.country,
      university: user.university,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            casesLimit: subscription.casesLimit,
            casesUsed: subscription.casesUsed,
            casesRemaining: subscription.casesLimit - subscription.casesUsed,
            generationsLimit: subscription.generationsLimit,
            generationsUsed: subscription.generationsUsed,
            usageResetAt: subscription.usageResetAt,
          }
        : undefined,
    }
  }
}

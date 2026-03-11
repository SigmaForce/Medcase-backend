import { Inject, Injectable } from '@nestjs/common'
import { IUserRepository } from '../../domain/interfaces/user-repository.interface'
import { IAuditLogRepository } from '../../domain/interfaces/audit-log-repository.interface'
import { DomainException } from '../../../../errors/domain-exception'
import { UserResponseDto } from '../dtos/user-response.dto'
import { completeOnboardingSchema } from '../dtos/complete-onboarding.dto'

export interface CompleteOnboardingInput {
  userId: string
  country: string
  university: string
}

@Injectable()
export class CompleteOnboarding {
  constructor(
    @Inject('IUserRepository') private readonly userRepo: IUserRepository,
    @Inject('IAuditLogRepository') private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  async execute(input: CompleteOnboardingInput): Promise<UserResponseDto> {
    const data = completeOnboardingSchema.parse(input)

    const user = await this.userRepo.findById(input.userId)
    if (!user) throw new DomainException('USER_NOT_FOUND', 404)

    if (user.country && user.university) {
      throw new DomainException('ONBOARDING_ALREADY_COMPLETED')
    }

    user.country = data.country
    user.university = data.university
    const updated = await this.userRepo.update(user)

    await this.auditLogRepo.log({
      userId: user.id,
      action: 'user.onboarding_completed',
      entity: 'user',
      entityId: user.id,
    })

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      country: updated.country,
      university: updated.university,
      role: updated.role,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
    }
  }
}

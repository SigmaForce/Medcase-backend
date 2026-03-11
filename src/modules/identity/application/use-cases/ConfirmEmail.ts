import { Inject, Injectable } from '@nestjs/common'
import { createHash } from 'crypto'
import dayjs from 'dayjs'
import { IEmailVerificationRepository } from '../../domain/interfaces/email-verification-repository.interface'
import { IUserRepository } from '../../domain/interfaces/user-repository.interface'
import { IAuditLogRepository } from '../../domain/interfaces/audit-log-repository.interface'
import { DomainException } from '../../../../errors/domain-exception'

@Injectable()
export class ConfirmEmail {
  constructor(
    @Inject('IEmailVerificationRepository')
    private readonly emailVerificationRepo: IEmailVerificationRepository,
    @Inject('IUserRepository') private readonly userRepo: IUserRepository,
    @Inject('IAuditLogRepository') private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  async execute(rawToken: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const verification = await this.emailVerificationRepo.findByTokenHash(tokenHash)

    if (!verification || verification.usedAt) {
      throw new DomainException('INVALID_OR_EXPIRED_TOKEN')
    }

    if (dayjs().isAfter(verification.expiresAt)) {
      throw new DomainException('INVALID_OR_EXPIRED_TOKEN')
    }

    const user = await this.userRepo.findById(verification.userId)
    if (!user) throw new DomainException('INVALID_OR_EXPIRED_TOKEN')

    await this.emailVerificationRepo.markUsed(verification.id)

    user.isActive = true
    await this.userRepo.update(user)

    await this.auditLogRepo.log({
      userId: user.id,
      action: 'user.email_confirmed',
      entity: 'user',
      entityId: user.id,
    })
  }
}

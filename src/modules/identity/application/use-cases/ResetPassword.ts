import { Inject, Injectable } from '@nestjs/common'
import { createHash } from 'crypto'
import * as bcrypt from 'bcrypt'
import dayjs from 'dayjs'
import { IUserRepository } from '../../domain/interfaces/user-repository.interface'
import { IPasswordResetRepository } from '../../domain/interfaces/password-reset-repository.interface'
import { IRefreshTokenRepository } from '../../domain/interfaces/refresh-token-repository.interface'
import { IAuditLogRepository } from '../../domain/interfaces/audit-log-repository.interface'
import { Password } from '../../domain/value-objects/password.vo'
import { DomainException } from '../../../../errors/domain-exception'

@Injectable()
export class ResetPassword {
  constructor(
    @Inject('IUserRepository') private readonly userRepo: IUserRepository,
    @Inject('IPasswordResetRepository') private readonly passwordResetRepo: IPasswordResetRepository,
    @Inject('IRefreshTokenRepository') private readonly refreshTokenRepo: IRefreshTokenRepository,
    @Inject('IAuditLogRepository') private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  async execute(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const reset = await this.passwordResetRepo.findByTokenHash(tokenHash)

    if (!reset || reset.usedAt) throw new DomainException('INVALID_OR_EXPIRED_TOKEN')
    if (dayjs().isAfter(reset.expiresAt)) throw new DomainException('INVALID_OR_EXPIRED_TOKEN')

    const user = await this.userRepo.findById(reset.userId)
    if (!user) throw new DomainException('INVALID_OR_EXPIRED_TOKEN')

    Password.validate(newPassword, user.email)

    user.passwordHash = await bcrypt.hash(newPassword, 12)
    await this.userRepo.update(user)

    await this.passwordResetRepo.markUsed(reset.id)
    await this.refreshTokenRepo.deleteAllByUserId(user.id)

    await this.auditLogRepo.log({
      userId: user.id,
      action: 'user.password_reset',
      entity: 'user',
      entityId: user.id,
    })
  }
}

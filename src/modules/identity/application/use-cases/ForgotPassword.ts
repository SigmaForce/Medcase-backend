import { Inject, Injectable } from '@nestjs/common'
import { randomBytes, createHash } from 'crypto'
import { IUserRepository } from '../../domain/interfaces/user-repository.interface'
import { IPasswordResetRepository } from '../../domain/interfaces/password-reset-repository.interface'
import { IEmailService } from '../../domain/interfaces/email-service.interface'
import { PasswordReset } from '../../domain/entities/password-reset.entity'

@Injectable()
export class ForgotPassword {
  constructor(
    @Inject('IUserRepository') private readonly userRepo: IUserRepository,
    @Inject('IPasswordResetRepository') private readonly passwordResetRepo: IPasswordResetRepository,
    @Inject('IEmailService') private readonly emailService: IEmailService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email)
    if (!user) return

    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const reset = PasswordReset.create(user.id, tokenHash)
    await this.passwordResetRepo.create(reset)

    await this.emailService.sendPasswordReset({
      to: user.email,
      token: rawToken,
      fullName: user.fullName,
    })
  }
}

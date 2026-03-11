import { Inject, Injectable } from '@nestjs/common'
import { randomBytes, createHash } from 'crypto'
import { IUserRepository } from '../../domain/interfaces/user-repository.interface'
import { IEmailVerificationRepository } from '../../domain/interfaces/email-verification-repository.interface'
import { IEmailService } from '../../domain/interfaces/email-service.interface'
import { EmailVerification } from '../../domain/entities/email-verification.entity'

@Injectable()
export class ResendConfirmation {
  constructor(
    @Inject('IUserRepository') private readonly userRepo: IUserRepository,
    @Inject('IEmailVerificationRepository')
    private readonly emailVerificationRepo: IEmailVerificationRepository,
    @Inject('IEmailService') private readonly emailService: IEmailService,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email)
    if (!user || user.isActive) return

    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const emailVerification = EmailVerification.create(user.id, tokenHash)
    await this.emailVerificationRepo.create(emailVerification)

    await this.emailService.sendEmailConfirmation({
      to: user.email,
      token: rawToken,
      fullName: user.fullName,
    })
  }
}

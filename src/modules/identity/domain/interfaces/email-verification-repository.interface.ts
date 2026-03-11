import { EmailVerification } from '../entities/email-verification.entity'

export interface IEmailVerificationRepository {
  create(ev: EmailVerification): Promise<void>
  findByTokenHash(hash: string): Promise<EmailVerification | null>
  findActiveByUserId(userId: string): Promise<EmailVerification | null>
  markUsed(id: string): Promise<void>
}

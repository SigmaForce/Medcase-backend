import { PasswordReset } from '../entities/password-reset.entity'

export interface IPasswordResetRepository {
  create(reset: PasswordReset): Promise<void>
  findByTokenHash(hash: string): Promise<PasswordReset | null>
  markUsed(id: string): Promise<void>
}

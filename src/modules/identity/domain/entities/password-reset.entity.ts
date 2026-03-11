import dayjs from 'dayjs'

export class PasswordReset {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date

  static create(userId: string, tokenHash: string): PasswordReset {
    const reset = new PasswordReset()
    reset.id = ''
    reset.userId = userId
    reset.tokenHash = tokenHash
    reset.expiresAt = dayjs().add(1, 'hour').toDate()
    reset.usedAt = null
    reset.createdAt = new Date()
    return reset
  }
}

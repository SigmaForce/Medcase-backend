import dayjs from 'dayjs'

export class EmailVerification {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date

  static create(userId: string, tokenHash: string): EmailVerification {
    const ev = new EmailVerification()
    ev.id = ''
    ev.userId = userId
    ev.tokenHash = tokenHash
    ev.expiresAt = dayjs().add(24, 'hour').toDate()
    ev.usedAt = null
    ev.createdAt = new Date()
    return ev
  }
}

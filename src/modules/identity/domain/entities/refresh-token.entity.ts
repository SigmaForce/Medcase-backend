import dayjs from 'dayjs'

export class RefreshToken {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  createdAt: Date

  static create(userId: string, tokenHash: string): RefreshToken {
    const token = new RefreshToken()
    token.id = ''
    token.userId = userId
    token.tokenHash = tokenHash
    token.expiresAt = dayjs().add(7, 'day').toDate()
    token.createdAt = new Date()
    return token
  }
}

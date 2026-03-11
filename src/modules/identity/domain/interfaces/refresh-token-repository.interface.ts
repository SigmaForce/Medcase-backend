import { RefreshToken } from '../entities/refresh-token.entity'

export interface IRefreshTokenRepository {
  create(token: RefreshToken): Promise<void>
  findByTokenHash(hash: string): Promise<RefreshToken | null>
  deleteByTokenHash(hash: string): Promise<void>
  deleteAllByUserId(userId: string): Promise<void>
}

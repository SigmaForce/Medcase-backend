import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import { IRefreshTokenRepository } from '../../domain/interfaces/refresh-token-repository.interface'
import { RefreshToken } from '../../domain/entities/refresh-token.entity'

const toDomain = (record: {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  createdAt: Date
}): RefreshToken => {
  const token = new RefreshToken()
  token.id = record.id
  token.userId = record.userId
  token.tokenHash = record.tokenHash
  token.expiresAt = record.expiresAt
  token.createdAt = record.createdAt
  return token
}

@Injectable()
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(token: RefreshToken): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
      },
    })
  }

  async findByTokenHash(hash: string): Promise<RefreshToken | null> {
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } })
    return record ? toDomain(record) : null
  }

  async deleteByTokenHash(hash: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: hash } })
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } })
  }
}

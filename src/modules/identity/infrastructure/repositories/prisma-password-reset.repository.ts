import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import { IPasswordResetRepository } from '../../domain/interfaces/password-reset-repository.interface'
import { PasswordReset } from '../../domain/entities/password-reset.entity'

const toDomain = (record: {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}): PasswordReset => {
  const reset = new PasswordReset()
  reset.id = record.id
  reset.userId = record.userId
  reset.tokenHash = record.tokenHash
  reset.expiresAt = record.expiresAt
  reset.usedAt = record.usedAt
  reset.createdAt = record.createdAt
  return reset
}

@Injectable()
export class PrismaPasswordResetRepository implements IPasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(reset: PasswordReset): Promise<void> {
    await this.prisma.passwordReset.create({
      data: {
        userId: reset.userId,
        tokenHash: reset.tokenHash,
        expiresAt: reset.expiresAt,
      },
    })
  }

  async findByTokenHash(hash: string): Promise<PasswordReset | null> {
    const record = await this.prisma.passwordReset.findUnique({ where: { tokenHash: hash } })
    return record ? toDomain(record) : null
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.passwordReset.update({
      where: { id },
      data: { usedAt: new Date() },
    })
  }
}

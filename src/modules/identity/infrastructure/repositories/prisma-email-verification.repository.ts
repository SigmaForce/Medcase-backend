import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import { IEmailVerificationRepository } from '../../domain/interfaces/email-verification-repository.interface'
import { EmailVerification } from '../../domain/entities/email-verification.entity'

const toDomain = (record: {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}): EmailVerification => {
  const ev = new EmailVerification()
  ev.id = record.id
  ev.userId = record.userId
  ev.tokenHash = record.tokenHash
  ev.expiresAt = record.expiresAt
  ev.usedAt = record.usedAt
  ev.createdAt = record.createdAt
  return ev
}

@Injectable()
export class PrismaEmailVerificationRepository implements IEmailVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(ev: EmailVerification): Promise<void> {
    await this.prisma.emailVerification.create({
      data: {
        userId: ev.userId,
        tokenHash: ev.tokenHash,
        expiresAt: ev.expiresAt,
      },
    })
  }

  async findByTokenHash(hash: string): Promise<EmailVerification | null> {
    const record = await this.prisma.emailVerification.findUnique({ where: { tokenHash: hash } })
    return record ? toDomain(record) : null
  }

  async findActiveByUserId(userId: string): Promise<EmailVerification | null> {
    const record = await this.prisma.emailVerification.findFirst({
      where: { userId, usedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    return record ? toDomain(record) : null
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.emailVerification.update({
      where: { id },
      data: { usedAt: new Date() },
    })
  }
}

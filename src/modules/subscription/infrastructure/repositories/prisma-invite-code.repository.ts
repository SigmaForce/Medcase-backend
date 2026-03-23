import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import {
  IInviteCodeRepository,
  InviteGroupSummary,
} from '../../domain/interfaces/invite-code-repository.interface'
import { InviteCode } from '../../domain/entities/invite-code.entity'

@Injectable()
export class PrismaInviteCodeRepository implements IInviteCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findValid(code: string): Promise<InviteCode | null> {
    const record = await this.prisma.inviteCode.findFirst({
      where: { code, usedAt: null, expiresAt: { gt: new Date() } },
    })
    return record ? this.toDomain(record) : null
  }

  async markAsUsed(id: string, usedById: string): Promise<void> {
    await this.prisma.inviteCode.update({
      where: { id },
      data: { usedById, usedAt: new Date() },
    })
  }

  async createBatch(codes: InviteCode[]): Promise<InviteCode[]> {
    await this.prisma.inviteCode.createMany({
      data: codes.map((c) => ({
        code: c.code,
        createdById: c.createdById,
        label: c.label,
        trialDays: c.trialDays,
        expiresAt: c.expiresAt,
      })),
    })
    const stored = await this.prisma.inviteCode.findMany({
      where: { code: { in: codes.map((c) => c.code) } },
    })
    return stored.map((r) => this.toDomain(r))
  }

  async listGroupedByLabel(): Promise<InviteGroupSummary[]> {
    const records = await this.prisma.inviteCode.findMany({
      select: { label: true, usedAt: true },
    })

    const map = new Map<string, { total: number; used: number }>()
    for (const r of records) {
      const key = r.label ?? '(sem label)'
      const entry = map.get(key) ?? { total: 0, used: 0 }
      entry.total += 1
      if (r.usedAt) entry.used += 1
      map.set(key, entry)
    }

    return Array.from(map.entries()).map(([label, stats]) => ({
      label,
      total: stats.total,
      used: stats.used,
      remaining: stats.total - stats.used,
    }))
  }

  private toDomain(record: {
    id: string
    code: string
    createdById: string
    usedById: string | null
    label: string | null
    trialDays: number
    expiresAt: Date
    usedAt: Date | null
    createdAt: Date
  }): InviteCode {
    return InviteCode.create({
      id: record.id,
      code: record.code,
      createdById: record.createdById,
      usedById: record.usedById,
      label: record.label,
      trialDays: record.trialDays,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
    })
  }
}

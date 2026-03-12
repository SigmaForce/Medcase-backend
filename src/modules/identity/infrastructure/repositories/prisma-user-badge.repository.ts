import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import { IUserBadgeRepository } from '../../domain/interfaces/user-badge-repository.interface'
import { UserBadge, BadgeSlug } from '../../domain/entities/user-badge.entity'

@Injectable()
export class PrismaUserBadgeRepository implements IUserBadgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string): Promise<UserBadge[]> {
    const records = await this.prisma.userBadge.findMany({ where: { userId }, orderBy: { earnedAt: 'asc' } })
    return records.map((r) => this.toDomain(r))
  }

  async hasBadge(userId: string, badgeSlug: BadgeSlug): Promise<boolean> {
    const record = await this.prisma.userBadge.findUnique({
      where: { unique_badge: { userId, badgeSlug } },
    })
    return record !== null
  }

  async award(badge: UserBadge): Promise<UserBadge> {
    const record = await this.prisma.userBadge.create({
      data: {
        userId: badge.userId,
        badgeSlug: badge.badgeSlug,
        earnedAt: badge.earnedAt,
      },
    })
    return this.toDomain(record)
  }

  private toDomain(record: { id: string; userId: string; badgeSlug: string; earnedAt: Date }): UserBadge {
    return UserBadge.create({
      id: record.id,
      userId: record.userId,
      badgeSlug: record.badgeSlug as BadgeSlug,
      earnedAt: record.earnedAt,
    })
  }
}

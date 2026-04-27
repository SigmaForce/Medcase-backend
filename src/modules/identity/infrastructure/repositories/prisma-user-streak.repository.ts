import { Injectable } from '@nestjs/common'
import dayjs from 'dayjs'
import { PrismaService } from '../../../../infra/database/prisma.service'
import {
  IUserStreakRepository,
  AtRiskUser,
  FindAtRiskOptions,
} from '../../domain/interfaces/user-streak-repository.interface'
import { UserStreak } from '../../domain/entities/user-streak.entity'

@Injectable()
export class PrismaUserStreakRepository implements IUserStreakRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<UserStreak | null> {
    const record = await this.prisma.userStreak.findUnique({ where: { userId } })
    return record ? this.toDomain(record) : null
  }

  async upsert(streak: UserStreak): Promise<UserStreak> {
    const record = await this.prisma.userStreak.upsert({
      where: { userId: streak.userId },
      create: {
        userId: streak.userId,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        lastActivityAt: streak.lastActivityAt,
        totalSessions: streak.totalSessions,
      },
      update: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        lastActivityAt: streak.lastActivityAt,
        totalSessions: streak.totalSessions,
      },
    })
    return this.toDomain(record)
  }

  async findAtRiskToday(options?: FindAtRiskOptions): Promise<AtRiskUser[]> {
    const startOfToday = dayjs().startOf('day').toDate()
    const records = await this.prisma.userStreak.findMany({
      where: {
        lastActivityAt: { lt: startOfToday },
        user: {
          isActive: true,
          subscription: { plan: 'free' },
        },
      },
      include: {
        user: {
          select: {
            email: true,
            fullName: true,
            subscription: { select: { casesLimit: true, casesUsed: true } },
          },
        },
      },
      take: options?.take,
      skip: options?.skip,
    })

    return records
      .filter(
        (r) =>
          r.user.subscription !== null &&
          r.user.subscription.casesUsed < r.user.subscription.casesLimit,
      )
      .map((r) => ({
        userId: r.userId,
        remainingCases: (r.user.subscription!.casesLimit - r.user.subscription!.casesUsed),
        email: r.user.email,
        fullName: r.user.fullName,
      }))
  }

  private toDomain(record: {
    id: string
    userId: string
    currentStreak: number
    longestStreak: number
    lastActivityAt: Date | null
    totalSessions: number
    updatedAt: Date
  }): UserStreak {
    return UserStreak.create({
      id: record.id,
      userId: record.userId,
      currentStreak: record.currentStreak,
      longestStreak: record.longestStreak,
      lastActivityAt: record.lastActivityAt,
      totalSessions: record.totalSessions,
      updatedAt: record.updatedAt,
    })
  }
}

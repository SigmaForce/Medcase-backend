import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infra/database/prisma.service'
import { IUserStreakRepository } from '../../domain/interfaces/user-streak-repository.interface'
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

import { Inject, Injectable } from '@nestjs/common'
import { IUserStreakRepository } from '../../domain/interfaces/user-streak-repository.interface'
import { IUserBadgeRepository } from '../../domain/interfaces/user-badge-repository.interface'

export interface GetStatsInput {
  userId: string
}

@Injectable()
export class GetStats {
  constructor(
    @Inject('IUserStreakRepository') private readonly streakRepo: IUserStreakRepository,
    @Inject('IUserBadgeRepository') private readonly badgeRepo: IUserBadgeRepository,
  ) {}

  async execute({ userId }: GetStatsInput) {
    const [streak, badges] = await Promise.all([
      this.streakRepo.findByUserId(userId),
      this.badgeRepo.findByUser(userId),
    ])

    return {
      streak: {
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
        lastActivityAt: streak?.lastActivityAt ?? null,
        totalSessions: streak?.totalSessions ?? 0,
      },
      badges: badges.map((b) => ({ badgeSlug: b.badgeSlug, earnedAt: b.earnedAt })),
      ranking: null,
    }
  }
}

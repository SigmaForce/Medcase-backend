import { Inject, Injectable } from '@nestjs/common'
import dayjs from 'dayjs'
import { IUserStreakRepository } from '../../../identity/domain/interfaces/user-streak-repository.interface'
import { UserStreak } from '../../../identity/domain/entities/user-streak.entity'

export interface StreakUpdateInput {
  userId: string
}

@Injectable()
export class StreakUpdaterService {
  constructor(
    @Inject('IUserStreakRepository') private readonly streakRepo: IUserStreakRepository,
  ) {}

  async update({ userId }: StreakUpdateInput): Promise<UserStreak> {
    const existing = await this.streakRepo.findByUserId(userId)
    const now = dayjs()

    if (!existing) {
      const streak = UserStreak.create({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityAt: now.toDate(),
        totalSessions: 1,
      })
      return this.streakRepo.upsert(streak)
    }

    const last = existing.lastActivityAt ? dayjs(existing.lastActivityAt) : null
    const diffDays = last ? now.startOf('day').diff(last.startOf('day'), 'day') : null

    let newCurrent: number
    if (diffDays === null || diffDays > 1) {
      newCurrent = 1
    } else if (diffDays === 1) {
      newCurrent = existing.currentStreak + 1
    } else {
      newCurrent = existing.currentStreak
    }

    const newLongest = Math.max(existing.longestStreak, newCurrent)

    existing.currentStreak = newCurrent
    existing.longestStreak = newLongest
    existing.lastActivityAt = now.toDate()
    existing.totalSessions = existing.totalSessions + 1

    return this.streakRepo.upsert(existing)
  }
}

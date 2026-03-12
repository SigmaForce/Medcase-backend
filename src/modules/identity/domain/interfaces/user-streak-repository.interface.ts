import { UserStreak } from '../entities/user-streak.entity'

export interface IUserStreakRepository {
  findByUserId(userId: string): Promise<UserStreak | null>
  upsert(streak: UserStreak): Promise<UserStreak>
}

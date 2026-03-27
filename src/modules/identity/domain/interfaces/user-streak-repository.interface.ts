import { UserStreak } from '../entities/user-streak.entity'

export interface AtRiskUser {
  userId: string
  currentStreak: number
  email: string
  fullName: string
}

export interface FindAtRiskOptions {
  take?: number
  skip?: number
}

export interface IUserStreakRepository {
  findByUserId(userId: string): Promise<UserStreak | null>
  upsert(streak: UserStreak): Promise<UserStreak>
  findAtRiskToday(options?: FindAtRiskOptions): Promise<AtRiskUser[]>
}

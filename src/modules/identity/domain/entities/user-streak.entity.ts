export interface CreateUserStreakProps {
  id?: string
  userId: string
  currentStreak?: number
  longestStreak?: number
  lastActivityAt?: Date | null
  totalSessions?: number
  updatedAt?: Date
}

export class UserStreak {
  id: string
  userId: string
  currentStreak: number
  longestStreak: number
  lastActivityAt: Date | null
  totalSessions: number
  updatedAt: Date

  static create(props: CreateUserStreakProps): UserStreak {
    const streak = new UserStreak()
    streak.id = props.id ?? ''
    streak.userId = props.userId
    streak.currentStreak = props.currentStreak ?? 0
    streak.longestStreak = props.longestStreak ?? 0
    streak.lastActivityAt = props.lastActivityAt ?? null
    streak.totalSessions = props.totalSessions ?? 0
    streak.updatedAt = props.updatedAt ?? new Date()
    return streak
  }
}

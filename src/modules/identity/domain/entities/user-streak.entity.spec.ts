import { UserStreak } from './user-streak.entity'

describe('UserStreak', () => {
  it('creates with default values', () => {
    const streak = UserStreak.create({ userId: 'u1' })
    expect(streak.userId).toBe('u1')
    expect(streak.currentStreak).toBe(0)
    expect(streak.longestStreak).toBe(0)
    expect(streak.lastActivityAt).toBeNull()
    expect(streak.totalSessions).toBe(0)
    expect(streak.id).toBe('')
    expect(streak.updatedAt).toBeInstanceOf(Date)
  })

  it('creates with all fields', () => {
    const now = new Date()
    const streak = UserStreak.create({
      id: 'streak-uuid',
      userId: 'u1',
      currentStreak: 5,
      longestStreak: 12,
      lastActivityAt: now,
      totalSessions: 20,
    })
    expect(streak.id).toBe('streak-uuid')
    expect(streak.currentStreak).toBe(5)
    expect(streak.longestStreak).toBe(12)
    expect(streak.lastActivityAt).toBe(now)
    expect(streak.totalSessions).toBe(20)
  })
})

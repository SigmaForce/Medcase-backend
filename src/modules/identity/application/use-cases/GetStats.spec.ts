import { GetStats } from './GetStats'

const mockStreakRepo = { findByUserId: jest.fn(), upsert: jest.fn() }
const mockBadgeRepo = { findByUser: jest.fn(), hasBadge: jest.fn(), award: jest.fn() }

describe('GetStats', () => {
  let useCase: GetStats

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GetStats(mockStreakRepo as never, mockBadgeRepo as never)
  })

  it('returns zeroed streak when user has no streak record', async () => {
    mockStreakRepo.findByUserId.mockResolvedValue(null)
    mockBadgeRepo.findByUser.mockResolvedValue([])

    const result = await useCase.execute({ userId: 'u1' })

    expect(result.streak.currentStreak).toBe(0)
    expect(result.streak.longestStreak).toBe(0)
    expect(result.streak.totalSessions).toBe(0)
    expect(result.streak.lastActivityAt).toBeNull()
    expect(result.badges).toHaveLength(0)
    expect(result.ranking).toBeNull()
  })

  it('returns streak and badges correctly', async () => {
    const now = new Date()
    mockStreakRepo.findByUserId.mockResolvedValue({
      currentStreak: 5, longestStreak: 12, lastActivityAt: now, totalSessions: 20,
    })
    mockBadgeRepo.findByUser.mockResolvedValue([
      { badgeSlug: 'first_case', earnedAt: new Date('2025-01-01') },
      { badgeSlug: 'streak_3', earnedAt: new Date('2025-01-05') },
    ])

    const result = await useCase.execute({ userId: 'u1' })

    expect(result.streak.currentStreak).toBe(5)
    expect(result.streak.longestStreak).toBe(12)
    expect(result.badges).toHaveLength(2)
    expect(result.badges[0].badgeSlug).toBe('first_case')
  })
})

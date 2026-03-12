import { StreakUpdaterService } from './streak-updater.service'
import { UserStreak } from '../../../identity/domain/entities/user-streak.entity'
import dayjs from 'dayjs'

jest.mock('src/config/env', () => ({ env: { NODE_ENV: 'test' } }))

const mockStreakRepo = { findByUserId: jest.fn(), upsert: jest.fn() }

const makeStreak = (overrides = {}) => UserStreak.create({
  userId: 'u1', currentStreak: 3, longestStreak: 5, totalSessions: 10, lastActivityAt: new Date(), ...overrides,
})

describe('StreakUpdaterService', () => {
  let service: StreakUpdaterService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new StreakUpdaterService(mockStreakRepo as never)
    mockStreakRepo.upsert.mockImplementation((s: UserStreak) => Promise.resolve(s))
  })

  it('creates new streak with currentStreak=1 for first-time user', async () => {
    mockStreakRepo.findByUserId.mockResolvedValue(null)
    const result = await service.update({ userId: 'u1' })
    expect(result.currentStreak).toBe(1)
    expect(result.longestStreak).toBe(1)
    expect(result.totalSessions).toBe(1)
  })

  it('increments streak on consecutive day', async () => {
    const yesterday = dayjs().subtract(1, 'day').toDate()
    mockStreakRepo.findByUserId.mockResolvedValue(makeStreak({ lastActivityAt: yesterday, currentStreak: 3, longestStreak: 5 }))
    const result = await service.update({ userId: 'u1' })
    expect(result.currentStreak).toBe(4)
    expect(result.totalSessions).toBe(11)
  })

  it('resets streak when last activity was more than 1 day ago', async () => {
    const threeDaysAgo = dayjs().subtract(3, 'day').toDate()
    mockStreakRepo.findByUserId.mockResolvedValue(makeStreak({ lastActivityAt: threeDaysAgo, currentStreak: 10, longestStreak: 15 }))
    const result = await service.update({ userId: 'u1' })
    expect(result.currentStreak).toBe(1)
    expect(result.longestStreak).toBe(15)
  })

  it('does not change streak when same day', async () => {
    const now = new Date()
    mockStreakRepo.findByUserId.mockResolvedValue(makeStreak({ lastActivityAt: now, currentStreak: 5, longestStreak: 5 }))
    const result = await service.update({ userId: 'u1' })
    expect(result.currentStreak).toBe(5)
    expect(result.totalSessions).toBe(11)
  })
})

import { BadgeAwarderService } from './badge-awarder.service'
import { UserStreak } from '../../../identity/domain/entities/user-streak.entity'

jest.mock('src/config/env', () => ({ env: { NODE_ENV: 'test' } }))

const mockBadgeRepo = { findByUser: jest.fn(), hasBadge: jest.fn(), award: jest.fn() }

const makeStreak = (overrides = {}) => UserStreak.create({
  userId: 'u1', currentStreak: 1, longestStreak: 1, totalSessions: 1, lastActivityAt: new Date(), ...overrides,
})

describe('BadgeAwarderService', () => {
  let service: BadgeAwarderService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new BadgeAwarderService(mockBadgeRepo as never)
    mockBadgeRepo.hasBadge.mockResolvedValue(false)
    mockBadgeRepo.award.mockResolvedValue({})
  })

  it('awards first_case badge when totalSessions === 1', async () => {
    const streak = makeStreak({ totalSessions: 1 })
    const awarded = await service.award({ userId: 'u1', streak, scoreTotal: 70 })
    expect(awarded).toContain('first_case')
    expect(mockBadgeRepo.award).toHaveBeenCalledTimes(1)
  })

  it('awards ten_cases badge when totalSessions === 10', async () => {
    const streak = makeStreak({ totalSessions: 10 })
    const awarded = await service.award({ userId: 'u1', streak, scoreTotal: 70 })
    expect(awarded).toContain('ten_cases')
  })

  it('awards perfect_score badge when scoreTotal >= 100', async () => {
    const streak = makeStreak({ totalSessions: 5 })
    const awarded = await service.award({ userId: 'u1', streak, scoreTotal: 100 })
    expect(awarded).toContain('perfect_score')
  })

  it('does not re-award badge already earned', async () => {
    mockBadgeRepo.hasBadge.mockResolvedValue(true)
    const streak = makeStreak({ totalSessions: 1 })
    const awarded = await service.award({ userId: 'u1', streak, scoreTotal: 50 })
    expect(awarded).toHaveLength(0)
    expect(mockBadgeRepo.award).not.toHaveBeenCalled()
  })

  it('awards streak_3 badge when currentStreak >= 3', async () => {
    const streak = makeStreak({ currentStreak: 3, totalSessions: 5 })
    const awarded = await service.award({ userId: 'u1', streak, scoreTotal: 50 })
    expect(awarded).toContain('streak_3')
  })
})

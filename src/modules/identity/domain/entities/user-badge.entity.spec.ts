import { UserBadge } from './user-badge.entity'

describe('UserBadge', () => {
  it('creates with default values', () => {
    const badge = UserBadge.create({ userId: 'u1', badgeSlug: 'first_case' })
    expect(badge.userId).toBe('u1')
    expect(badge.badgeSlug).toBe('first_case')
    expect(badge.id).toBe('')
    expect(badge.earnedAt).toBeInstanceOf(Date)
  })

  it('creates with all fields', () => {
    const now = new Date('2025-01-01')
    const badge = UserBadge.create({ id: 'badge-uuid', userId: 'u1', badgeSlug: 'streak_7', earnedAt: now })
    expect(badge.id).toBe('badge-uuid')
    expect(badge.badgeSlug).toBe('streak_7')
    expect(badge.earnedAt).toBe(now)
  })
})

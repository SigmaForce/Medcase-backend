import dayjs from 'dayjs'
import { Subscription } from './subscription.entity'

describe('Subscription.createFree', () => {
  it('creates a free subscription with correct defaults', () => {
    const sub = Subscription.createFree('user-1')
    expect(sub.userId).toBe('user-1')
    expect(sub.plan).toBe('free')
    expect(sub.status).toBe('active')
    expect(sub.casesLimit).toBe(5)
    expect(sub.casesUsed).toBe(0)
    expect(sub.generationsLimit).toBe(0)
    expect(sub.generationsUsed).toBe(0)
    expect(sub.provider).toBeNull()
    expect(sub.externalSubId).toBeNull()
  })

  it('sets usageResetAt approximately 1 month from now', () => {
    const before = dayjs().add(29, 'day')
    const sub = Subscription.createFree('user-1')
    const after = dayjs().add(32, 'day')
    expect(dayjs(sub.usageResetAt).isAfter(before)).toBe(true)
    expect(dayjs(sub.usageResetAt).isBefore(after)).toBe(true)
  })

  it('sets createdAt and updatedAt close to now', () => {
    const before = new Date()
    const sub = Subscription.createFree('user-1')
    const after = new Date()
    expect(sub.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(sub.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime())
  })
})

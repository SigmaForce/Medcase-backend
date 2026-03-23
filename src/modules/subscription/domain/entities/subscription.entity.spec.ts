import dayjs from 'dayjs'
import { Subscription } from './subscription.entity'

describe('Subscription', () => {
  describe('createFree', () => {
    it('should create a free subscription with correct defaults', () => {
      const sub = Subscription.createFree('user-1')

      expect(sub.userId).toBe('user-1')
      expect(sub.plan).toBe('free')
      expect(sub.status).toBe('active')
      expect(sub.casesLimit).toBe(5)
      expect(sub.casesUsed).toBe(0)
      expect(sub.generationsLimit).toBe(0)
      expect(sub.generationsUsed).toBe(0)
      expect(sub.externalSubId).toBeNull()
      expect(sub.provider).toBeNull()
      expect(sub.cancelAtPeriodEnd).toBe(false)
    })

    it('should set usageResetAt approximately 1 month in the future', () => {
      const before = dayjs().add(29, 'day')
      const sub = Subscription.createFree('user-1')
      const after = dayjs().add(32, 'day')

      expect(dayjs(sub.usageResetAt).isAfter(before)).toBe(true)
      expect(dayjs(sub.usageResetAt).isBefore(after)).toBe(true)
    })

    it('should set createdAt and updatedAt close to now', () => {
      const before = new Date()
      const sub = Subscription.createFree('user-1')
      const after = new Date()

      expect(sub.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(sub.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('createTrial', () => {
    it('should create a trial subscription with plan=pro and status=trial', () => {
      const sub = Subscription.createTrial('user-2', 14)

      expect(sub.userId).toBe('user-2')
      expect(sub.plan).toBe('pro')
      expect(sub.status).toBe('trial')
      expect(sub.casesLimit).toBe(999)
      expect(sub.casesUsed).toBe(0)
      expect(sub.generationsLimit).toBe(999)
      expect(sub.generationsUsed).toBe(0)
      expect(sub.cancelAtPeriodEnd).toBe(false)
    })

    it('should set trialEndsAt based on trialDays param', () => {
      const trialDays = 14
      const expectedEnd = dayjs().add(trialDays, 'day')
      const sub = Subscription.createTrial('user-2', trialDays)

      const diffMs = Math.abs(dayjs(sub.trialEndsAt).diff(expectedEnd, 'millisecond'))
      expect(diffMs).toBeLessThan(1000)
    })

    it('should respect different trialDays values', () => {
      const sub7 = Subscription.createTrial('user-2', 7)
      const sub30 = Subscription.createTrial('user-2', 30)

      const diff = dayjs(sub30.trialEndsAt).diff(dayjs(sub7.trialEndsAt), 'day')
      expect(diff).toBeCloseTo(23, 0)
    })
  })

  describe('upgradeToPro', () => {
    it('should upgrade subscription to pro with correct fields', () => {
      const sub = Subscription.createFree('user-3')
      const periodEnd = new Date('2027-01-01')

      sub.upgradeToPro({
        plan: 'pro',
        status: 'active',
        provider: 'stripe',
        externalSubId: 'sub_123',
        externalCustomer: 'cus_456',
        currentPeriodEnd: periodEnd,
      })

      expect(sub.plan).toBe('pro')
      expect(sub.status).toBe('active')
      expect(sub.casesLimit).toBe(999)
      expect(sub.generationsLimit).toBe(999)
      expect(sub.externalSubId).toBe('sub_123')
      expect(sub.externalCustomer).toBe('cus_456')
      expect(sub.provider).toBe('stripe')
      expect(sub.currentPeriodEnd).toEqual(periodEnd)
      expect(sub.cancelAtPeriodEnd).toBe(false)
      expect(sub.trialEndsAt).toBeNull()
    })

    it('should handle null currentPeriodEnd', () => {
      const sub = Subscription.createFree('user-3')

      sub.upgradeToPro({
        plan: 'pro',
        status: 'active',
        provider: 'stripe',
        externalSubId: 'sub_123',
        externalCustomer: 'cus_456',
        currentPeriodEnd: null,
      })

      expect(sub.currentPeriodEnd).toBeNull()
    })
  })

  describe('downgradeToFree', () => {
    it('should downgrade to free and clear external fields', () => {
      const sub = Subscription.createFree('user-4')
      sub.upgradeToPro({
        plan: 'pro',
        status: 'active',
        provider: 'stripe',
        externalSubId: 'sub_abc',
        externalCustomer: 'cus_abc',
      })

      sub.downgradeToFree()

      expect(sub.plan).toBe('free')
      expect(sub.status).toBe('active')
      expect(sub.casesLimit).toBe(5)
      expect(sub.generationsLimit).toBe(0)
      expect(sub.casesUsed).toBe(0)
      expect(sub.generationsUsed).toBe(0)
      expect(sub.externalSubId).toBeNull()
      expect(sub.externalCustomer).toBeNull()
      expect(sub.provider).toBeNull()
      expect(sub.cancelAtPeriodEnd).toBe(false)
    })
  })

  describe('resetUsage', () => {
    it('should reset casesUsed and generationsUsed to 0', () => {
      const sub = Subscription.createFree('user-5')
      sub.casesUsed = 3
      sub.generationsUsed = 2

      sub.resetUsage()

      expect(sub.casesUsed).toBe(0)
      expect(sub.generationsUsed).toBe(0)
    })

    it('should update usageResetAt approximately 1 month in the future', () => {
      const sub = Subscription.createFree('user-5')
      const before = dayjs().add(29, 'day')

      sub.resetUsage()

      const after = dayjs().add(32, 'day')
      expect(dayjs(sub.usageResetAt).isAfter(before)).toBe(true)
      expect(dayjs(sub.usageResetAt).isBefore(after)).toBe(true)
    })
  })
})

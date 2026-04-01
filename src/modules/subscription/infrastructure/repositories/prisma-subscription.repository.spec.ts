import dayjs from 'dayjs'
import { PrismaSubscriptionRepository } from './prisma-subscription.repository'

const makeDbRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'sub-id',
  userId: 'user-id',
  plan: 'free',
  status: 'active',
  casesLimit: 5,
  casesUsed: 3,
  generationsLimit: 0,
  generationsUsed: 0,
  usageResetAt: new Date(),
  provider: null,
  externalSubId: null,
  externalCustomer: null,
  trialEndsAt: null,
  cancelAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const mockPrisma = {
  subscription: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
}

describe('PrismaSubscriptionRepository — reset methods', () => {
  let repo: PrismaSubscriptionRepository

  beforeEach(() => {
    jest.clearAllMocks()
    repo = new PrismaSubscriptionRepository(mockPrisma as never)
  })

  describe('findDueForReset', () => {
    it('queries subscriptions where usageResetAt is in the past', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([])

      await repo.findDueForReset()

      const callArgs = mockPrisma.subscription.findMany.mock.calls[0][0]
      expect(callArgs.where.usageResetAt).toMatchObject({ lte: expect.any(Date) })
    })

    it('filters only subscriptions with at least one counter above zero', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([])

      await repo.findDueForReset()

      const callArgs = mockPrisma.subscription.findMany.mock.calls[0][0]
      expect(callArgs.where.OR).toEqual(
        expect.arrayContaining([
          { casesUsed: { gt: 0 } },
          { generationsUsed: { gt: 0 } },
        ]),
      )
    })

    it('returns mapped Subscription domain objects', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        makeDbRecord({ userId: 'user-1', casesUsed: 2 }),
        makeDbRecord({ userId: 'user-2', casesUsed: 4 }),
      ])

      const result = await repo.findDueForReset()

      expect(result).toHaveLength(2)
      expect(result[0].userId).toBe('user-1')
      expect(result[1].userId).toBe('user-2')
    })

    it('returns empty array when no subscriptions are due', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([])

      const result = await repo.findDueForReset()

      expect(result).toHaveLength(0)
    })
  })

  describe('resetUsage', () => {
    it('resets casesUsed and generationsUsed to 0', async () => {
      mockPrisma.subscription.update.mockResolvedValue(makeDbRecord({ casesUsed: 0, generationsUsed: 0 }))

      await repo.resetUsage('user-id')

      const callArgs = mockPrisma.subscription.update.mock.calls[0][0]
      expect(callArgs.data.casesUsed).toBe(0)
      expect(callArgs.data.generationsUsed).toBe(0)
    })

    it('sets usageResetAt to approximately 1 month from now', async () => {
      mockPrisma.subscription.update.mockResolvedValue(
        makeDbRecord({ usageResetAt: dayjs().add(1, 'month').toDate() }),
      )

      const before = dayjs().add(29, 'day')
      const after = dayjs().add(32, 'day')

      await repo.resetUsage('user-id')

      const callArgs = mockPrisma.subscription.update.mock.calls[0][0]
      const nextReset = dayjs(callArgs.data.usageResetAt)
      expect(nextReset.isAfter(before)).toBe(true)
      expect(nextReset.isBefore(after)).toBe(true)
    })

    it('updates the correct userId', async () => {
      mockPrisma.subscription.update.mockResolvedValue(makeDbRecord())

      await repo.resetUsage('specific-user-id')

      const callArgs = mockPrisma.subscription.update.mock.calls[0][0]
      expect(callArgs.where.userId).toBe('specific-user-id')
    })
  })
})

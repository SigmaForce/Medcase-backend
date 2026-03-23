import { SubscriptionResetService } from './subscription-reset.service'
import { Subscription } from '../../domain/entities/subscription.entity'

const mockSubscriptionRepo = {
  findDueForReset: jest.fn(),
  resetUsage: jest.fn(),
}

const makeSubscription = (userId: string): Subscription => {
  const sub = Subscription.createFree(userId)
  sub.casesUsed = 3
  return sub
}

describe('SubscriptionResetService', () => {
  let service: SubscriptionResetService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new SubscriptionResetService(mockSubscriptionRepo as never)
  })

  it('should reset usage for all subscriptions due for reset', async () => {
    const subs = [makeSubscription('user-1'), makeSubscription('user-2')]
    mockSubscriptionRepo.findDueForReset.mockResolvedValue(subs)
    mockSubscriptionRepo.resetUsage.mockResolvedValue(undefined)

    await service.resetExpiredUsage()

    expect(mockSubscriptionRepo.resetUsage).toHaveBeenCalledTimes(2)
    expect(mockSubscriptionRepo.resetUsage).toHaveBeenCalledWith('user-1')
    expect(mockSubscriptionRepo.resetUsage).toHaveBeenCalledWith('user-2')
  })

  it('should do nothing when no subscriptions are due for reset', async () => {
    mockSubscriptionRepo.findDueForReset.mockResolvedValue([])

    await service.resetExpiredUsage()

    expect(mockSubscriptionRepo.resetUsage).not.toHaveBeenCalled()
  })
})

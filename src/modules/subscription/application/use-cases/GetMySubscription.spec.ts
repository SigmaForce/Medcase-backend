import { GetMySubscription } from './GetMySubscription'
import { DomainException } from '../../../../errors/domain-exception'
import { Subscription } from '../../domain/entities/subscription.entity'

const mockSubscriptionRepo = {
  findByUserId: jest.fn(),
}

describe('GetMySubscription', () => {
  let useCase: GetMySubscription

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GetMySubscription(mockSubscriptionRepo as never)
  })

  it('should return subscription output when found', async () => {
    const sub = Subscription.createFree('user-1')
    sub.id = 'sub-1'
    mockSubscriptionRepo.findByUserId.mockResolvedValue(sub)

    const result = await useCase.execute({ userId: 'user-1' })

    expect(result.plan).toBe('free')
    expect(result.status).toBe('active')
    expect(result.casesLimit).toBe(5)
    expect(result.casesUsed).toBe(0)
    expect(result.provider).toBeNull()
    expect(result.cancelAtPeriodEnd).toBe(false)
    expect(mockSubscriptionRepo.findByUserId).toHaveBeenCalledWith('user-1')
  })

  it('should throw SUBSCRIPTION_NOT_FOUND when subscription does not exist', async () => {
    mockSubscriptionRepo.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute({ userId: 'user-999' })).rejects.toMatchObject({
      code: 'SUBSCRIPTION_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('should throw a DomainException when not found', async () => {
    mockSubscriptionRepo.findByUserId.mockResolvedValue(null)

    await expect(useCase.execute({ userId: 'user-999' })).rejects.toBeInstanceOf(DomainException)
  })
})

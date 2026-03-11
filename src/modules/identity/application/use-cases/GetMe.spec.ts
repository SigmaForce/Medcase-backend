import { GetMe } from './GetMe'
import { DomainException } from '../../../../errors/domain-exception'
import { User } from '../../domain/entities/user.entity'
import { Subscription } from '../../../subscription/domain/entities/subscription.entity'

const mockUserRepo = { findById: jest.fn() }
const mockSubscriptionRepo = { findByUserId: jest.fn() }

const makeUser = (): User =>
  User.create({
    id: 'user-1',
    email: 'a@b.com',
    passwordHash: 'hash',
    fullName: 'Alice',
    country: 'BR',
    university: 'USP',
    isActive: true,
  })

describe('GetMe', () => {
  let useCase: GetMe

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GetMe(mockUserRepo as any, mockSubscriptionRepo as any)
  })

  it('throws USER_NOT_FOUND when user does not exist', async () => {
    mockUserRepo.findById.mockResolvedValue(null)
    await expect(useCase.execute('user-1')).rejects.toThrow(DomainException)
    await expect(useCase.execute('user-1')).rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 })
  })

  it('returns user without subscription when no subscription exists', async () => {
    mockUserRepo.findById.mockResolvedValue(makeUser())
    mockSubscriptionRepo.findByUserId.mockResolvedValue(null)

    const result = await useCase.execute('user-1')
    expect(result.email).toBe('a@b.com')
    expect(result.subscription).toBeUndefined()
  })

  it('returns user with subscription and casesRemaining computed', async () => {
    mockUserRepo.findById.mockResolvedValue(makeUser())
    const sub = Subscription.createFree('user-1')
    sub.casesUsed = 2
    mockSubscriptionRepo.findByUserId.mockResolvedValue(sub)

    const result = await useCase.execute('user-1')
    expect(result.subscription).toBeDefined()
    expect(result.subscription!.casesRemaining).toBe(3) // 5 - 2
    expect(result.subscription!.plan).toBe('free')
  })
})

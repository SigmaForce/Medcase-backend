import { CompleteOnboarding } from './CompleteOnboarding'
import { DomainException } from '../../../../errors/domain-exception'
import { User } from '../../domain/entities/user.entity'

const mockUserRepo = { findById: jest.fn(), update: jest.fn() }
const mockAuditLogRepo = { log: jest.fn() }

const makeUser = (overrides: Partial<User> = {}): User => {
  const user = Object.assign(new User(), {
    id: 'user-1',
    email: 'alice@example.com',
    passwordHash: 'hash',
    fullName: 'Alice',
    country: 'BR',
    university: 'USP',
    role: 'student',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })
  return user
}

describe('CompleteOnboarding', () => {
  let useCase: CompleteOnboarding

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CompleteOnboarding(mockUserRepo as any, mockAuditLogRepo as any)
  })

  it('throws USER_NOT_FOUND when user does not exist', async () => {
    mockUserRepo.findById.mockResolvedValue(null)
    await expect(
      useCase.execute({ userId: 'user-1', country: 'BR', university: 'USP' }),
    ).rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 })
  })

  it('throws ONBOARDING_ALREADY_COMPLETED when country and university are already set', async () => {
    mockUserRepo.findById.mockResolvedValue(makeUser())
    await expect(
      useCase.execute({ userId: 'user-1', country: 'PY', university: 'UNA' }),
    ).rejects.toMatchObject({ code: 'ONBOARDING_ALREADY_COMPLETED' })
  })

  it('updates country and university and returns updated user', async () => {
    // User without country/university to simulate incomplete onboarding
    const user = makeUser({ country: '', university: '' })
    mockUserRepo.findById.mockResolvedValue(user)

    const updated = makeUser({ country: 'PY', university: 'UNA' })
    mockUserRepo.update.mockResolvedValue(updated)
    mockAuditLogRepo.log.mockResolvedValue(undefined)

    const result = await useCase.execute({ userId: 'user-1', country: 'PY', university: 'UNA' })

    expect(mockUserRepo.update).toHaveBeenCalled()
    expect(mockAuditLogRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.onboarding_completed' }),
    )
    expect(result.country).toBe('PY')
    expect(result.university).toBe('UNA')
  })

  it('throws a ZodError for invalid country', async () => {
    const user = makeUser({ country: '', university: '' })
    mockUserRepo.findById.mockResolvedValue(user)
    await expect(
      useCase.execute({ userId: 'user-1', country: 'XX', university: 'USP' }),
    ).rejects.toThrow()
  })
})

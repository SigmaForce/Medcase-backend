import { ResendConfirmation } from './ResendConfirmation'
import { User } from '../../domain/entities/user.entity'

const mockUserRepo = { findByEmail: jest.fn() }
const mockEmailVerificationRepo = { create: jest.fn() }
const mockEmailService = { sendEmailConfirmation: jest.fn() }

const makeInactiveUser = (): User =>
  User.create({
    id: 'user-1',
    email: 'alice@example.com',
    passwordHash: 'hash',
    fullName: 'Alice',
    country: 'BR',
    university: 'USP',
    isActive: false,
  })

describe('ResendConfirmation', () => {
  let useCase: ResendConfirmation

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ResendConfirmation(
      mockUserRepo as any,
      mockEmailVerificationRepo as any,
      mockEmailService as any,
    )
  })

  it('returns silently when user not found', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    await expect(useCase.execute('unknown@example.com')).resolves.toBeUndefined()
    expect(mockEmailService.sendEmailConfirmation).not.toHaveBeenCalled()
  })

  it('returns silently when user is already active', async () => {
    const activeUser = makeInactiveUser()
    activeUser.isActive = true
    mockUserRepo.findByEmail.mockResolvedValue(activeUser)
    await expect(useCase.execute('alice@example.com')).resolves.toBeUndefined()
    expect(mockEmailService.sendEmailConfirmation).not.toHaveBeenCalled()
  })

  it('creates token and sends email for inactive user', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(makeInactiveUser())
    mockEmailVerificationRepo.create.mockResolvedValue(undefined)
    mockEmailService.sendEmailConfirmation.mockResolvedValue(undefined)

    await useCase.execute('alice@example.com')

    expect(mockEmailVerificationRepo.create).toHaveBeenCalledTimes(1)
    expect(mockEmailService.sendEmailConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'alice@example.com', fullName: 'Alice' }),
    )
  })
})

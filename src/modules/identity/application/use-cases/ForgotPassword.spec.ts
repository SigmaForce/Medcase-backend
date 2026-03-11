import { ForgotPassword } from './ForgotPassword'
import { User } from '../../domain/entities/user.entity'

const mockUserRepo = { findByEmail: jest.fn() }
const mockPasswordResetRepo = { create: jest.fn() }
const mockEmailService = { sendPasswordReset: jest.fn() }

const makeUser = (): User =>
  User.create({
    id: 'user-1',
    email: 'alice@example.com',
    passwordHash: 'hash',
    fullName: 'Alice',
    country: 'BR',
    university: 'USP',
    isActive: true,
  })

describe('ForgotPassword', () => {
  let useCase: ForgotPassword

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ForgotPassword(
      mockUserRepo as any,
      mockPasswordResetRepo as any,
      mockEmailService as any,
    )
  })

  it('returns silently when user is not found (no-op for security)', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    await expect(useCase.execute('unknown@example.com')).resolves.toBeUndefined()
    expect(mockPasswordResetRepo.create).not.toHaveBeenCalled()
    expect(mockEmailService.sendPasswordReset).not.toHaveBeenCalled()
  })

  it('creates reset token and sends email when user exists', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(makeUser())
    mockPasswordResetRepo.create.mockResolvedValue(undefined)
    mockEmailService.sendPasswordReset.mockResolvedValue(undefined)

    await useCase.execute('alice@example.com')

    expect(mockPasswordResetRepo.create).toHaveBeenCalledTimes(1)
    expect(mockEmailService.sendPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'alice@example.com', fullName: 'Alice' }),
    )
  })
})

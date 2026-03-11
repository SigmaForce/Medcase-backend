import dayjs from 'dayjs'
import { ResetPassword } from './ResetPassword'
import { DomainException } from '../../../../errors/domain-exception'
import { User } from '../../domain/entities/user.entity'
import { PasswordReset } from '../../domain/entities/password-reset.entity'

jest.mock('src/config/env', () => ({ env: { NODE_ENV: 'test', JWT_SECRET: 'test-secret' } }))

const mockUserRepo = { findById: jest.fn(), update: jest.fn() }
const mockPasswordResetRepo = { findByTokenHash: jest.fn(), markUsed: jest.fn() }
const mockRefreshTokenRepo = { deleteAllByUserId: jest.fn() }
const mockAuditLogRepo = { log: jest.fn() }

const makeReset = (overrides: Partial<PasswordReset> = {}): PasswordReset => {
  const reset = PasswordReset.create('user-1', 'hash')
  return Object.assign(reset, { id: 'reset-1', ...overrides })
}

const makeUser = (): User =>
  User.create({
    id: 'user-1',
    email: 'alice@example.com',
    passwordHash: 'old-hash',
    fullName: 'Alice',
    country: 'BR',
    university: 'USP',
    isActive: true,
  })

describe('ResetPassword', () => {
  let useCase: ResetPassword

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ResetPassword(
      mockUserRepo as any,
      mockPasswordResetRepo as any,
      mockRefreshTokenRepo as any,
      mockAuditLogRepo as any,
    )
  })

  it('throws INVALID_OR_EXPIRED_TOKEN when reset record not found', async () => {
    mockPasswordResetRepo.findByTokenHash.mockResolvedValue(null)
    await expect(useCase.execute('raw-token', 'NewPass@1')).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_TOKEN',
    })
  })

  it('throws INVALID_OR_EXPIRED_TOKEN when token already used', async () => {
    mockPasswordResetRepo.findByTokenHash.mockResolvedValue(
      makeReset({ usedAt: new Date() }),
    )
    await expect(useCase.execute('raw-token', 'NewPass@1')).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_TOKEN',
    })
  })

  it('throws INVALID_OR_EXPIRED_TOKEN when token expired', async () => {
    mockPasswordResetRepo.findByTokenHash.mockResolvedValue(
      makeReset({ expiresAt: dayjs().subtract(2, 'hour').toDate() }),
    )
    await expect(useCase.execute('raw-token', 'NewPass@1')).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_TOKEN',
    })
  })

  it('throws INVALID_OR_EXPIRED_TOKEN when user not found', async () => {
    mockPasswordResetRepo.findByTokenHash.mockResolvedValue(makeReset())
    mockUserRepo.findById.mockResolvedValue(null)
    await expect(useCase.execute('raw-token', 'NewPass@1')).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_TOKEN',
    })
  })

  it('throws PASSWORD_TOO_WEAK for weak new password', async () => {
    mockPasswordResetRepo.findByTokenHash.mockResolvedValue(makeReset())
    mockUserRepo.findById.mockResolvedValue(makeUser())
    await expect(useCase.execute('raw-token', 'weakpassword')).rejects.toMatchObject({
      code: 'PASSWORD_TOO_WEAK',
    })
  })

  it('updates password, marks token used and invalidates refresh tokens on success', async () => {
    mockPasswordResetRepo.findByTokenHash.mockResolvedValue(makeReset())
    const user = makeUser()
    mockUserRepo.findById.mockResolvedValue(user)
    mockUserRepo.update.mockResolvedValue(undefined)
    mockPasswordResetRepo.markUsed.mockResolvedValue(undefined)
    mockRefreshTokenRepo.deleteAllByUserId.mockResolvedValue(undefined)
    mockAuditLogRepo.log.mockResolvedValue(undefined)

    await useCase.execute('raw-token', 'NewPass@1Strong')

    expect(mockUserRepo.update).toHaveBeenCalledWith(user)
    expect(mockPasswordResetRepo.markUsed).toHaveBeenCalledWith('reset-1')
    expect(mockRefreshTokenRepo.deleteAllByUserId).toHaveBeenCalledWith('user-1')
    expect(mockAuditLogRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.password_reset' }),
    )
  })
})

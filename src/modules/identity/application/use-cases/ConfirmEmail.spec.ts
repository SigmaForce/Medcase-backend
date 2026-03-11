import dayjs from 'dayjs'
import { ConfirmEmail } from './ConfirmEmail'
import { DomainException } from '../../../../errors/domain-exception'
import { User } from '../../domain/entities/user.entity'
import { EmailVerification } from '../../domain/entities/email-verification.entity'

const mockEmailVerificationRepo = {
  findByTokenHash: jest.fn(),
  markUsed: jest.fn(),
}
const mockUserRepo = {
  findById: jest.fn(),
  update: jest.fn(),
}
const mockAuditLogRepo = { log: jest.fn() }

const makeVerification = (overrides: Partial<EmailVerification> = {}): EmailVerification => {
  const ev = EmailVerification.create('user-1', 'hash')
  return Object.assign(ev, { id: 'ev-1', ...overrides })
}

const makeUser = (): User =>
  User.create({
    id: 'user-1',
    email: 'alice@example.com',
    passwordHash: 'hash',
    fullName: 'Alice',
    country: 'BR',
    university: 'USP',
    isActive: false,
  })

describe('ConfirmEmail', () => {
  let useCase: ConfirmEmail

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ConfirmEmail(
      mockEmailVerificationRepo as any,
      mockUserRepo as any,
      mockAuditLogRepo as any,
    )
  })

  it('throws INVALID_OR_EXPIRED_TOKEN when verification not found', async () => {
    mockEmailVerificationRepo.findByTokenHash.mockResolvedValue(null)
    await expect(useCase.execute('raw-token')).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_TOKEN',
    })
  })

  it('throws INVALID_OR_EXPIRED_TOKEN when token already used', async () => {
    mockEmailVerificationRepo.findByTokenHash.mockResolvedValue(
      makeVerification({ usedAt: new Date() }),
    )
    await expect(useCase.execute('raw-token')).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_TOKEN',
    })
  })

  it('throws INVALID_OR_EXPIRED_TOKEN when token expired', async () => {
    mockEmailVerificationRepo.findByTokenHash.mockResolvedValue(
      makeVerification({ expiresAt: dayjs().subtract(1, 'hour').toDate() }),
    )
    await expect(useCase.execute('raw-token')).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_TOKEN',
    })
  })

  it('throws INVALID_OR_EXPIRED_TOKEN when user not found', async () => {
    mockEmailVerificationRepo.findByTokenHash.mockResolvedValue(makeVerification())
    mockUserRepo.findById.mockResolvedValue(null)
    await expect(useCase.execute('raw-token')).rejects.toMatchObject({
      code: 'INVALID_OR_EXPIRED_TOKEN',
    })
  })

  it('marks token used and activates user on success', async () => {
    mockEmailVerificationRepo.findByTokenHash.mockResolvedValue(makeVerification())
    const user = makeUser()
    mockUserRepo.findById.mockResolvedValue(user)
    mockEmailVerificationRepo.markUsed.mockResolvedValue(undefined)
    mockUserRepo.update.mockResolvedValue(undefined)
    mockAuditLogRepo.log.mockResolvedValue(undefined)

    await useCase.execute('raw-token')

    expect(mockEmailVerificationRepo.markUsed).toHaveBeenCalledWith('ev-1')
    expect(user.isActive).toBe(true)
    expect(mockUserRepo.update).toHaveBeenCalledWith(user)
    expect(mockAuditLogRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.email_confirmed' }),
    )
  })
})

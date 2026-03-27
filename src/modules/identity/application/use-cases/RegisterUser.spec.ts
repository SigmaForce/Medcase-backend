import { RegisterUser } from './RegisterUser'

jest.mock('src/config/env', () => ({
  env: { NODE_ENV: 'test', JWT_SECRET: 'test-secret' },
}))

const mockDbUser = {
  id: 'user-db-1',
  email: 'alice@example.com',
  fullName: 'Alice',
  country: 'BR',
  university: 'USP',
  role: 'student',
  isActive: false,
  createdAt: new Date(),
}

const mockTx = {
  user: { create: jest.fn().mockResolvedValue(mockDbUser) },
  subscription: { create: jest.fn().mockResolvedValue({}) },
  emailVerification: { create: jest.fn().mockResolvedValue({}) },
}

const mockUserRepo = { findByEmail: jest.fn() }
const mockSubscriptionRepo = {}
const mockInviteCodeRepo = { findValid: jest.fn(), markAsUsed: jest.fn() }
const mockEmailService = { sendEmailConfirmation: jest.fn() }
const mockAuditLogRepo = { log: jest.fn() }
const mockAnalyticsService = { track: jest.fn() }
const mockTxManager = {
  run: jest.fn().mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
}

const validInput = {
  email: 'alice@example.com',
  password: 'StrongP@ss1',
  fullName: 'Alice',
  country: 'BR',
  university: 'USP',
}

describe('RegisterUser', () => {
  let useCase: RegisterUser

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new RegisterUser(
      mockUserRepo as any,
      mockSubscriptionRepo as any,
      mockInviteCodeRepo as any,
      mockEmailService as any,
      mockAuditLogRepo as any,
      mockTxManager as any,
      mockAnalyticsService as any,
    )
  })

  it('registers a user successfully', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockEmailService.sendEmailConfirmation.mockResolvedValue(undefined)
    mockAuditLogRepo.log.mockResolvedValue(undefined)

    const result = await useCase.execute(validInput)

    expect(result.user.email).toBe('alice@example.com')
    expect(result.message).toContain('e-mail')
    expect(mockTx.user.create).toHaveBeenCalledTimes(1)
    expect(mockTx.subscription.create).toHaveBeenCalledTimes(1)
    expect(mockTx.emailVerification.create).toHaveBeenCalledTimes(1)
    expect(mockEmailService.sendEmailConfirmation).toHaveBeenCalledTimes(1)
    expect(mockAuditLogRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.registered' }),
    )
    expect(mockAnalyticsService.track).toHaveBeenCalledWith('user-db-1', 'user_registered', expect.objectContaining({ country: 'BR' }))
  })

  it('throws EMAIL_ALREADY_EXISTS when email is taken', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: 'existing-user' })
    await expect(useCase.execute(validInput)).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_EXISTS',
    })
  })

  it('throws PASSWORD_TOO_WEAK for weak password', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    await expect(
      useCase.execute({ ...validInput, password: 'weakpassword' }),
    ).rejects.toMatchObject({ code: 'PASSWORD_TOO_WEAK' })
  })

  it('throws a ZodError for invalid country', async () => {
    await expect(
      useCase.execute({ ...validInput, country: 'XX' }),
    ).rejects.toThrow()
  })

  it('creates trial subscription when valid invite code is provided', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockInviteCodeRepo.findValid.mockResolvedValue({ id: 'invite-1', trialDays: 30 })
    mockInviteCodeRepo.markAsUsed.mockResolvedValue(undefined)
    mockEmailService.sendEmailConfirmation.mockResolvedValue(undefined)
    mockAuditLogRepo.log.mockResolvedValue(undefined)

    const result = await useCase.execute({ ...validInput, invite_code: 'BETA-ABC123' })

    expect(result.user.email).toBe('alice@example.com')
    expect(mockAnalyticsService.track).toHaveBeenCalledWith('user-db-1', 'user_registered', expect.objectContaining({ method: 'invite' }))
  })

  it('throws INVALID_OR_EXPIRED_INVITE for invalid invite code', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockInviteCodeRepo.findValid.mockResolvedValue(null)

    await expect(
      useCase.execute({ ...validInput, invite_code: 'BETA-INVALID' }),
    ).rejects.toMatchObject({ code: 'INVALID_OR_EXPIRED_INVITE' })
  })
})

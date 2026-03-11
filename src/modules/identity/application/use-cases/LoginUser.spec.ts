import * as bcrypt from 'bcrypt'
import { LoginUser } from './LoginUser'
import { DomainException } from '../../../../errors/domain-exception'
import { User } from '../../domain/entities/user.entity'

jest.mock('src/config/env', () => ({ env: { NODE_ENV: 'test', JWT_SECRET: 'test-secret' } }))

const mockUserRepo = { findByEmail: jest.fn() }
const mockRefreshTokenRepo = { create: jest.fn() }
const mockAuditLogRepo = { log: jest.fn() }
const mockJwtService = { sign: jest.fn().mockReturnValue('access-token') }

const makeActiveUser = async (): Promise<User> => {
  const hash = await bcrypt.hash('StrongP@ss1', 1)
  const user = User.create({
    id: 'user-1',
    email: 'alice@example.com',
    passwordHash: hash,
    fullName: 'Alice',
    country: 'BR',
    university: 'USP',
    isActive: true,
  })
  return user
}

describe('LoginUser', () => {
  let useCase: LoginUser

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new LoginUser(
      mockUserRepo as any,
      mockRefreshTokenRepo as any,
      mockAuditLogRepo as any,
      mockJwtService as any,
    )
  })

  it('throws INVALID_CREDENTIALS when user not found', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    await expect(
      useCase.execute({ email: 'unknown@example.com', password: 'anything' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 })
  })

  it('throws INVALID_CREDENTIALS when password does not match', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(await makeActiveUser())
    await expect(
      useCase.execute({ email: 'alice@example.com', password: 'WrongPass' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 })
  })

  it('throws EMAIL_NOT_CONFIRMED when user is not active', async () => {
    const hash = await bcrypt.hash('StrongP@ss1', 1)
    const inactiveUser = User.create({
      id: 'user-1',
      email: 'alice@example.com',
      passwordHash: hash,
      fullName: 'Alice',
      country: 'BR',
      university: 'USP',
      isActive: false,
    })
    mockUserRepo.findByEmail.mockResolvedValue(inactiveUser)
    await expect(
      useCase.execute({ email: 'alice@example.com', password: 'StrongP@ss1' }),
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_CONFIRMED', statusCode: 403 })
  })

  it('returns tokens and user on success', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(await makeActiveUser())
    mockRefreshTokenRepo.create.mockResolvedValue(undefined)
    mockAuditLogRepo.log.mockResolvedValue(undefined)

    const result = await useCase.execute({ email: 'alice@example.com', password: 'StrongP@ss1' })

    expect(result.accessToken).toBe('access-token')
    expect(typeof result.refreshToken).toBe('string')
    expect(result.user.email).toBe('alice@example.com')
    expect(mockRefreshTokenRepo.create).toHaveBeenCalledTimes(1)
    expect(mockAuditLogRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.login' }),
    )
  })
})

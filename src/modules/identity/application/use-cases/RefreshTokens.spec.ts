import dayjs from 'dayjs'
import { RefreshTokens } from './RefreshTokens'
import { DomainException } from '../../../../errors/domain-exception'
import { User } from '../../domain/entities/user.entity'
import { RefreshToken } from '../../domain/entities/refresh-token.entity'

jest.mock('src/config/env', () => ({ env: { NODE_ENV: 'test', JWT_SECRET: 'test-secret' } }))

const mockRefreshTokenRepo = {
  findByTokenHash: jest.fn(),
  deleteByTokenHash: jest.fn(),
  create: jest.fn(),
}
const mockUserRepo = { findById: jest.fn() }
const mockJwtService = { sign: jest.fn().mockReturnValue('new-access-token') }

const makeStoredToken = (overrides: Partial<RefreshToken> = {}): RefreshToken => {
  const token = RefreshToken.create('user-1', 'stored-hash')
  return Object.assign(token, overrides)
}

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

describe('RefreshTokens', () => {
  let useCase: RefreshTokens

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new RefreshTokens(
      mockRefreshTokenRepo as any,
      mockUserRepo as any,
      mockJwtService as any,
    )
  })

  it('throws INVALID_REFRESH_TOKEN when token not found', async () => {
    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(null)
    await expect(useCase.execute('raw-token')).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
      statusCode: 401,
    })
  })

  it('throws REFRESH_TOKEN_EXPIRED and deletes token when expired', async () => {
    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(
      makeStoredToken({ expiresAt: dayjs().subtract(1, 'hour').toDate() }),
    )
    mockRefreshTokenRepo.deleteByTokenHash.mockResolvedValue(undefined)

    await expect(useCase.execute('raw-token')).rejects.toMatchObject({
      code: 'REFRESH_TOKEN_EXPIRED',
      statusCode: 401,
    })
    expect(mockRefreshTokenRepo.deleteByTokenHash).toHaveBeenCalledTimes(1)
  })

  it('throws INVALID_REFRESH_TOKEN when user not found', async () => {
    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(makeStoredToken())
    mockUserRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute('raw-token')).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    })
  })

  it('returns new access and refresh tokens on success', async () => {
    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(makeStoredToken())
    mockUserRepo.findById.mockResolvedValue(makeUser())
    mockRefreshTokenRepo.deleteByTokenHash.mockResolvedValue(undefined)
    mockRefreshTokenRepo.create.mockResolvedValue(undefined)

    const result = await useCase.execute('raw-token')

    expect(result.accessToken).toBe('new-access-token')
    expect(typeof result.refreshToken).toBe('string')
    expect(result.refreshToken.length).toBeGreaterThan(0)
    expect(mockRefreshTokenRepo.deleteByTokenHash).toHaveBeenCalledTimes(1)
    expect(mockRefreshTokenRepo.create).toHaveBeenCalledTimes(1)
  })
})

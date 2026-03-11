import { UnauthorizedException } from '@nestjs/common'
import { JwtAuthGuard } from './jwt-auth.guard'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

jest.mock('src/config/env', () => ({ env: { JWT_SECRET: 'test-secret' } }))

const makeContext = ({
  isPublic = false,
  authHeader = undefined as string | undefined,
  user = undefined as object | undefined,
} = {}) => {
  const request: Record<string, unknown> = {}
  if (user) request['user'] = user

  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { authorization: authHeader },
        ...request,
      }),
    }),
    _isPublic: isPublic,
  }
}

const makeReflector = (isPublic: boolean) => ({
  getAllAndOverride: jest.fn().mockReturnValue(isPublic),
})

const makeJwtService = (payload: object | null) => ({
  verifyAsync: payload
    ? jest.fn().mockResolvedValue(payload)
    : jest.fn().mockRejectedValue(new Error('invalid')),
})

describe('JwtAuthGuard', () => {
  it('returns true for @Public() routes without token', async () => {
    const guard = new JwtAuthGuard(makeJwtService(null) as any, makeReflector(true) as any)
    const result = await guard.canActivate(makeContext({ isPublic: true }) as any)
    expect(result).toBe(true)
  })

  it('throws UnauthorizedException with MISSING_TOKEN when no Authorization header', async () => {
    const guard = new JwtAuthGuard(makeJwtService(null) as any, makeReflector(false) as any)
    await expect(guard.canActivate(makeContext() as any)).rejects.toThrow(UnauthorizedException)
    await expect(guard.canActivate(makeContext() as any)).rejects.toMatchObject({
      response: { error: 'MISSING_TOKEN' },
    })
  })

  it('throws UnauthorizedException with INVALID_TOKEN when JWT is invalid', async () => {
    const guard = new JwtAuthGuard(makeJwtService(null) as any, makeReflector(false) as any)
    const ctx = makeContext({ authHeader: 'Bearer bad-token' })
    await expect(guard.canActivate(ctx as any)).rejects.toThrow(UnauthorizedException)
    await expect(guard.canActivate(ctx as any)).rejects.toMatchObject({
      response: { error: 'INVALID_TOKEN' },
    })
  })

  it('attaches payload to request and returns true for valid token', async () => {
    const payload = { sub: 'user-1', email: 'a@b.com', role: 'student' }
    const guard = new JwtAuthGuard(makeJwtService(payload) as any, makeReflector(false) as any)

    const request: Record<string, unknown> = { headers: { authorization: 'Bearer valid-token' } }
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    }

    const result = await guard.canActivate(ctx as any)
    expect(result).toBe(true)
    expect(request['user']).toEqual(payload)
  })

  it('returns null (not Bearer) when Authorization type is not Bearer', async () => {
    const guard = new JwtAuthGuard(makeJwtService(null) as any, makeReflector(false) as any)
    const ctx = makeContext({ authHeader: 'Basic some-creds' })
    await expect(guard.canActivate(ctx as any)).rejects.toMatchObject({
      response: { error: 'MISSING_TOKEN' },
    })
  })
})

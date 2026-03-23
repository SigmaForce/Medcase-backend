import { ForbiddenException } from '@nestjs/common'
import { AdminGuard } from './admin.guard'

const makeContext = (role?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  }) as never

describe('AdminGuard', () => {
  let guard: AdminGuard

  beforeEach(() => {
    guard = new AdminGuard()
  })

  it('allows admin role', () => {
    expect(guard.canActivate(makeContext('admin'))).toBe(true)
  })

  it('throws ForbiddenException for student role', () => {
    expect(() => guard.canActivate(makeContext('student'))).toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when no user', () => {
    expect(() => guard.canActivate(makeContext())).toThrow(ForbiddenException)
  })
})

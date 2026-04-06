import { ThrottlerBehindProxyGuard } from './throttler-behind-proxy.guard'

class TestableThrottlerBehindProxyGuard extends ThrottlerBehindProxyGuard {
  async testGetTracker(req: Partial<{ headers: Record<string, string>; ip: string; user?: { sub?: string } }>) {
    return this.getTracker(req as any)
  }
}

describe('ThrottlerBehindProxyGuard', () => {
  let guard: TestableThrottlerBehindProxyGuard

  beforeEach(() => {
    guard = new TestableThrottlerBehindProxyGuard(null as any, null as any, null as any)
  })

  describe('authenticated requests (req.user.sub present)', () => {
    it('returns user:<userId> when req.user.sub is present', async () => {
      const result = await guard.testGetTracker({
        headers: {},
        ip: '127.0.0.1',
        user: { sub: 'user-uuid-123' },
      })
      expect(result).toBe('user:user-uuid-123')
    })

    it('prioritizes userId over x-forwarded-for header', async () => {
      const result = await guard.testGetTracker({
        headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
        ip: '127.0.0.1',
        user: { sub: 'user-uuid-456' },
      })
      expect(result).toBe('user:user-uuid-456')
    })

    it('falls back to IP when req.user exists but sub is undefined', async () => {
      const result = await guard.testGetTracker({
        headers: { 'x-forwarded-for': '10.0.0.5' },
        ip: '127.0.0.1',
        user: {},
      })
      expect(result).toBe('10.0.0.5')
    })
  })

  describe('unauthenticated requests (public routes)', () => {
    it('returns first IP from x-forwarded-for header when present', async () => {
      const result = await guard.testGetTracker({
        headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
        ip: '127.0.0.1',
      })
      expect(result).toBe('10.0.0.1')
    })

    it('falls back to req.ip when x-forwarded-for is absent', async () => {
      const result = await guard.testGetTracker({ headers: {}, ip: '127.0.0.1' })
      expect(result).toBe('127.0.0.1')
    })

    it("returns 'unknown' when both x-forwarded-for and ip are absent", async () => {
      const result = await guard.testGetTracker({ headers: {} })
      expect(result).toBe('unknown')
    })
  })
})

import { EmailThrottlerGuard } from './email-throttler.guard'

class TestableEmailThrottlerGuard extends EmailThrottlerGuard {
  async testGetTracker(req: Partial<{ body: Record<string, unknown>; ip: string }>) {
    return this.getTracker(req as any)
  }
}

describe('EmailThrottlerGuard', () => {
  let guard: TestableEmailThrottlerGuard

  beforeEach(() => {
    guard = new TestableEmailThrottlerGuard(null as any, null as any, null as any)
  })

  it('returns req.body.email when present', async () => {
    const result = await guard.testGetTracker({ body: { email: 'user@test.com' }, ip: '1.2.3.4' })
    expect(result).toBe('user@test.com')
  })

  it('returns req.ip when body.email is absent', async () => {
    const result = await guard.testGetTracker({ body: {}, ip: '1.2.3.4' })
    expect(result).toBe('1.2.3.4')
  })

  it("returns 'unknown' when both body.email and ip are absent", async () => {
    const result = await guard.testGetTracker({ body: {} })
    expect(result).toBe('unknown')
  })
})

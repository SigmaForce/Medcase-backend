import dayjs from 'dayjs'
import { EmailVerification } from './email-verification.entity'

describe('EmailVerification.create', () => {
  it('sets userId, tokenHash and usedAt=null', () => {
    const ev = EmailVerification.create('user-1', 'hash-xyz')
    expect(ev.userId).toBe('user-1')
    expect(ev.tokenHash).toBe('hash-xyz')
    expect(ev.usedAt).toBeNull()
    expect(ev.id).toBe('')
  })

  it('sets expiresAt approximately 24 hours from now', () => {
    const before = dayjs().add(23, 'hour').add(59, 'minute')
    const ev = EmailVerification.create('user-1', 'hash')
    const after = dayjs().add(24, 'hour').add(1, 'minute')
    expect(dayjs(ev.expiresAt).isAfter(before)).toBe(true)
    expect(dayjs(ev.expiresAt).isBefore(after)).toBe(true)
  })

  it('sets createdAt close to now', () => {
    const before = new Date()
    const ev = EmailVerification.create('user-1', 'hash')
    const after = new Date()
    expect(ev.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(ev.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
  })
})

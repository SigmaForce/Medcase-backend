import dayjs from 'dayjs'
import { PasswordReset } from './password-reset.entity'

describe('PasswordReset.create', () => {
  it('sets userId, tokenHash and usedAt=null', () => {
    const reset = PasswordReset.create('user-1', 'hash-abc')
    expect(reset.userId).toBe('user-1')
    expect(reset.tokenHash).toBe('hash-abc')
    expect(reset.usedAt).toBeNull()
    expect(reset.id).toBe('')
  })

  it('sets expiresAt approximately 1 hour from now', () => {
    const before = dayjs().add(59, 'minute')
    const reset = PasswordReset.create('user-1', 'hash')
    const after = dayjs().add(61, 'minute')
    expect(dayjs(reset.expiresAt).isAfter(before)).toBe(true)
    expect(dayjs(reset.expiresAt).isBefore(after)).toBe(true)
  })

  it('sets createdAt close to now', () => {
    const before = new Date()
    const reset = PasswordReset.create('user-1', 'hash')
    const after = new Date()
    expect(reset.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(reset.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
  })
})

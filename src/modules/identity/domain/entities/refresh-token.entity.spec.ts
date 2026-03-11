import dayjs from 'dayjs'
import { RefreshToken } from './refresh-token.entity'

describe('RefreshToken.create', () => {
  it('sets userId and tokenHash', () => {
    const token = RefreshToken.create('user-1', 'hash-abc')
    expect(token.userId).toBe('user-1')
    expect(token.tokenHash).toBe('hash-abc')
    expect(token.id).toBe('')
  })

  it('sets expiresAt approximately 7 days from now', () => {
    const before = dayjs().add(6, 'day').add(23, 'hour')
    const token = RefreshToken.create('user-1', 'hash')
    const after = dayjs().add(7, 'day').add(1, 'minute')
    expect(dayjs(token.expiresAt).isAfter(before)).toBe(true)
    expect(dayjs(token.expiresAt).isBefore(after)).toBe(true)
  })

  it('sets createdAt close to now', () => {
    const before = new Date()
    const token = RefreshToken.create('user-1', 'hash')
    const after = new Date()
    expect(token.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(token.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
  })
})

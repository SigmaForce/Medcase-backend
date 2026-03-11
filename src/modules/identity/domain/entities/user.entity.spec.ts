import { User } from './user.entity'
import { DomainException } from '../../../../errors/domain-exception'

const baseProps = {
  email: 'test@example.com',
  passwordHash: 'hash123',
  fullName: 'Test User',
  country: 'BR',
  university: 'USP',
}

describe('User.create', () => {
  it('creates a user with valid BR country', () => {
    const user = User.create(baseProps)
    expect(user.email).toBe('test@example.com')
    expect(user.country).toBe('BR')
    expect(user.role).toBe('student')
    expect(user.isActive).toBe(false)
    expect(user.id).toBe('')
  })

  it('creates a user with valid PY country', () => {
    const user = User.create({ ...baseProps, country: 'PY' })
    expect(user.country).toBe('PY')
  })

  it('throws INVALID_COUNTRY for unsupported country', () => {
    expect(() => User.create({ ...baseProps, country: 'US' })).toThrow(DomainException)
    expect(() => User.create({ ...baseProps, country: 'US' })).toThrow('INVALID_COUNTRY')
  })

  it('applies provided role and isActive overrides', () => {
    const user = User.create({ ...baseProps, role: 'admin', isActive: true })
    expect(user.role).toBe('admin')
    expect(user.isActive).toBe(true)
  })

  it('uses provided id when given', () => {
    const user = User.create({ ...baseProps, id: 'uuid-123' })
    expect(user.id).toBe('uuid-123')
  })

  it('sets createdAt and updatedAt to provided values', () => {
    const date = new Date('2024-01-01')
    const user = User.create({ ...baseProps, createdAt: date, updatedAt: date })
    expect(user.createdAt).toBe(date)
    expect(user.updatedAt).toBe(date)
  })

  it('sets createdAt and updatedAt to now when not provided', () => {
    const before = new Date()
    const user = User.create(baseProps)
    const after = new Date()
    expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(user.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
  })
})

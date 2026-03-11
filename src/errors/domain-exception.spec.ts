import { DomainException } from './domain-exception'

describe('DomainException', () => {
  it('sets code and default statusCode 400', () => {
    const err = new DomainException('SOME_ERROR')
    expect(err.code).toBe('SOME_ERROR')
    expect(err.statusCode).toBe(400)
    expect(err.detail).toBeUndefined()
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('DomainException')
    expect(err.message).toBe('SOME_ERROR')
  })

  it('accepts custom statusCode', () => {
    const err = new DomainException('NOT_FOUND', 404)
    expect(err.statusCode).toBe(404)
  })

  it('accepts optional detail', () => {
    const err = new DomainException('BAD_INPUT', 422, 'field X is invalid')
    expect(err.detail).toBe('field X is invalid')
  })
})

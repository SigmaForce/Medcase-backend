import { Password } from './password.vo'
import { DomainException } from '../../../../errors/domain-exception'

describe('Password.validate', () => {
  const validEmail = 'user@example.com'

  it('accepts a valid strong password', () => {
    expect(() => Password.validate('StrongP@ss1', validEmail)).not.toThrow()
  })

  it('throws PASSWORD_TOO_WEAK when shorter than 8 chars', () => {
    expect(() => Password.validate('Ab1@x', validEmail)).toThrow(DomainException)
    expect(() => Password.validate('Ab1@x', validEmail)).toThrow('PASSWORD_TOO_WEAK')
  })

  it('throws PASSWORD_TOO_WEAK when missing uppercase', () => {
    expect(() => Password.validate('strongp@ss1', validEmail)).toThrow('PASSWORD_TOO_WEAK')
  })

  it('throws PASSWORD_TOO_WEAK when missing lowercase', () => {
    expect(() => Password.validate('STRONGP@SS1', validEmail)).toThrow('PASSWORD_TOO_WEAK')
  })

  it('throws PASSWORD_TOO_WEAK when missing digit', () => {
    expect(() => Password.validate('StrongP@ss', validEmail)).toThrow('PASSWORD_TOO_WEAK')
  })

  it('throws PASSWORD_TOO_WEAK when missing special char', () => {
    expect(() => Password.validate('StrongPass1', validEmail)).toThrow('PASSWORD_TOO_WEAK')
  })

  it('throws PASSWORD_TOO_WEAK when password contains email username', () => {
    // email username is "user", password contains "user"
    expect(() => Password.validate('UserStrong@1', 'user@example.com')).toThrow('PASSWORD_TOO_WEAK')
  })

  it('is case-insensitive for email username check', () => {
    expect(() => Password.validate('USERStrong@1', 'user@example.com')).toThrow('PASSWORD_TOO_WEAK')
  })
})

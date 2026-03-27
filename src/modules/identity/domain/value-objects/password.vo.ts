import { DomainException } from '../../../../errors/domain-exception'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/

export class Password {
  static validate(raw: string, email: string): void {
    if (raw.length > 72) {
      throw new DomainException('PASSWORD_TOO_LONG', 400, 'Máximo 72 caracteres')
    }

    if (!PASSWORD_REGEX.test(raw)) {
      throw new DomainException(
        'PASSWORD_TOO_WEAK',
        400,
        'Mínimo 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial',
      )
    }

    const emailUsername = email.split('@')[0].toLowerCase()
    if (raw.toLowerCase().includes(emailUsername)) {
      throw new DomainException('PASSWORD_TOO_WEAK', 400, 'A senha não pode conter o e-mail')
    }
  }
}

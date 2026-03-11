import { DomainException } from '../../../../errors/domain-exception'

export type UserRole = 'student' | 'reviewer' | 'admin'

const VALID_COUNTRIES = ['BR', 'PY'] as const

export interface CreateUserProps {
  id?: string
  email: string
  passwordHash: string
  fullName: string
  country: string
  university: string
  role?: UserRole
  isActive?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export class User {
  id: string
  email: string
  passwordHash: string
  fullName: string
  country: string
  university: string
  role: UserRole
  isActive: boolean
  createdAt: Date
  updatedAt: Date

  static create(props: CreateUserProps): User {
    if (!VALID_COUNTRIES.includes(props.country as (typeof VALID_COUNTRIES)[number])) {
      throw new DomainException('INVALID_COUNTRY', 400, `Accepted: ${VALID_COUNTRIES.join(', ')}`)
    }

    const user = new User()
    user.id = props.id ?? ''
    user.email = props.email
    user.passwordHash = props.passwordHash
    user.fullName = props.fullName
    user.country = props.country
    user.university = props.university
    user.role = props.role ?? 'student'
    user.isActive = props.isActive ?? false
    user.createdAt = props.createdAt ?? new Date()
    user.updatedAt = props.updatedAt ?? new Date()
    return user
  }
}

import { DomainException } from '../../../../errors/domain-exception'

export type SessionStatusValue = 'in_progress' | 'completed' | 'abandoned'

const VALID_STATUSES: SessionStatusValue[] = ['in_progress', 'completed', 'abandoned']

export class SessionStatus {
  private readonly _value: SessionStatusValue

  private constructor(value: SessionStatusValue) {
    this._value = value
  }

  static create(value: string): SessionStatus {
    if (!VALID_STATUSES.includes(value as SessionStatusValue)) {
      throw new DomainException(
        'INVALID_SESSION_STATUS',
        400,
        `Valid statuses: ${VALID_STATUSES.join(', ')}`,
      )
    }
    return new SessionStatus(value as SessionStatusValue)
  }

  static inProgress(): SessionStatus {
    return new SessionStatus('in_progress')
  }

  static completed(): SessionStatus {
    return new SessionStatus('completed')
  }

  static abandoned(): SessionStatus {
    return new SessionStatus('abandoned')
  }

  get value(): SessionStatusValue {
    return this._value
  }

  isInProgress(): boolean {
    return this._value === 'in_progress'
  }

  isCompleted(): boolean {
    return this._value === 'completed'
  }

  isAbandoned(): boolean {
    return this._value === 'abandoned'
  }
}

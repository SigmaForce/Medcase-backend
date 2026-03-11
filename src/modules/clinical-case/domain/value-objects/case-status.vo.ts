import { DomainException } from '../../../../errors/domain-exception'

export type CaseStatusValue = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'regenerating'

const VALID_STATUSES: CaseStatusValue[] = [
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'regenerating',
]

export class CaseStatus {
  private readonly _value: CaseStatusValue

  private constructor(value: CaseStatusValue) {
    this._value = value
  }

  static create(value: string): CaseStatus {
    if (!VALID_STATUSES.includes(value as CaseStatusValue)) {
      throw new DomainException(
        'INVALID_CASE_STATUS',
        400,
        `Accepted: ${VALID_STATUSES.join(', ')}`,
      )
    }
    return new CaseStatus(value as CaseStatusValue)
  }

  get value(): CaseStatusValue {
    return this._value
  }

  isApproved(): boolean {
    return this._value === 'approved'
  }

  equals(other: CaseStatus): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}

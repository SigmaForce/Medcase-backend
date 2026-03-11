import { DomainException } from '../../../../errors/domain-exception'

export interface CaseBriefData {
  diagnosis: string
  differential: string[]
  expected_management: string
  key_findings?: string[]
  teaching_points?: string[]
}

export class CaseBrief {
  private readonly _value: CaseBriefData

  private constructor(value: CaseBriefData) {
    this._value = value
  }

  static create(raw: unknown): CaseBrief {
    if (typeof raw !== 'object' || raw === null) {
      throw new DomainException('INVALID_CASE_BRIEF', 400, 'Must be an object')
    }

    const r = raw as Record<string, unknown>

    if (typeof r.diagnosis !== 'string' || r.diagnosis.trim() === '') {
      throw new DomainException('INVALID_CASE_BRIEF', 400, 'diagnosis is required')
    }

    if (!Array.isArray(r.differential) || r.differential.length < 2) {
      throw new DomainException(
        'INVALID_CASE_BRIEF',
        400,
        'differential must be an array with at least 2 items',
      )
    }

    if (typeof r.expected_management !== 'string' || r.expected_management.trim() === '') {
      throw new DomainException('INVALID_CASE_BRIEF', 400, 'expected_management is required')
    }

    return new CaseBrief({
      diagnosis: r.diagnosis as string,
      differential: r.differential as string[],
      expected_management: r.expected_management as string,
      key_findings: Array.isArray(r.key_findings) ? (r.key_findings as string[]) : [],
      teaching_points: Array.isArray(r.teaching_points) ? (r.teaching_points as string[]) : [],
    })
  }

  get value(): CaseBriefData {
    return this._value
  }

  toJSON(): CaseBriefData {
    return this._value
  }
}

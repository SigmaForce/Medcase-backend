import { CaseStatus } from './case-status.vo'
import { DomainException } from '../../../../errors/domain-exception'

describe('CaseStatus', () => {
  it('creates a valid status', () => {
    const status = CaseStatus.create('approved')
    expect(status.value).toBe('approved')
  })

  it('throws INVALID_CASE_STATUS for unknown value', () => {
    expect(() => CaseStatus.create('unknown')).toThrow(DomainException)
    expect(() => CaseStatus.create('unknown')).toThrow(
      expect.objectContaining({ code: 'INVALID_CASE_STATUS', statusCode: 400 }),
    )
  })

  it('isApproved returns true only for approved', () => {
    expect(CaseStatus.create('approved').isApproved()).toBe(true)
    expect(CaseStatus.create('draft').isApproved()).toBe(false)
    expect(CaseStatus.create('pending_review').isApproved()).toBe(false)
  })

  it('equals returns true for same value', () => {
    const a = CaseStatus.create('draft')
    const b = CaseStatus.create('draft')
    expect(a.equals(b)).toBe(true)
  })

  it('equals returns false for different value', () => {
    const a = CaseStatus.create('draft')
    const b = CaseStatus.create('rejected')
    expect(a.equals(b)).toBe(false)
  })

  it('toString returns the value', () => {
    expect(CaseStatus.create('regenerating').toString()).toBe('regenerating')
  })

  it.each(['draft', 'pending_review', 'approved', 'rejected', 'regenerating'])(
    'accepts valid status %s',
    (s) => {
      expect(() => CaseStatus.create(s)).not.toThrow()
    },
  )
})

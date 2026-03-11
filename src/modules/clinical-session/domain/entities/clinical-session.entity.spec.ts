import { ClinicalSession } from './clinical-session.entity'
import { DomainException } from '../../../../errors/domain-exception'

const validProps = {
  userId: 'user-1',
  caseId: 'case-1',
}

describe('ClinicalSession', () => {
  it('creates with default values', () => {
    const session = ClinicalSession.create(validProps)
    expect(session.status).toBe('in_progress')
    expect(session.isTimed).toBe(false)
    expect(session.timedLimitSecs).toBe(2700)
    expect(session.requestedExams).toEqual([])
    expect(session.missedKeyExams).toEqual([])
    expect(session.feedback).toBeNull()
    expect(session.submittedDiagnosis).toBeNull()
    expect(session.submittedManagement).toBeNull()
    expect(session.completedAt).toBeNull()
    expect(session.durationSecs).toBeNull()
  })

  it('throws INVALID_SESSION_PROPS when userId missing', () => {
    expect(() =>
      ClinicalSession.create({ userId: '', caseId: 'case-1' }),
    ).toThrow(DomainException)
  })

  it('throws INVALID_SESSION_PROPS when caseId missing', () => {
    expect(() =>
      ClinicalSession.create({ userId: 'user-1', caseId: '' }),
    ).toThrow(DomainException)
  })

  it('isInProgress returns true for in_progress status', () => {
    const session = ClinicalSession.create(validProps)
    expect(session.isInProgress()).toBe(true)
    expect(session.isCompleted()).toBe(false)
    expect(session.isAbandoned()).toBe(false)
  })

  it('complete sets status to completed and fills fields', () => {
    const session = ClinicalSession.create(validProps)
    session.complete({
      submittedDiagnosis: 'IAM',
      submittedManagement: 'AAS + heparina',
      feedback: { score_total: 80 },
      missedKeyExams: ['troponina'],
    })
    expect(session.isCompleted()).toBe(true)
    expect(session.submittedDiagnosis).toBe('IAM')
    expect(session.submittedManagement).toBe('AAS + heparina')
    expect(session.feedback).toEqual({ score_total: 80 })
    expect(session.missedKeyExams).toEqual(['troponina'])
    expect(session.completedAt).toBeInstanceOf(Date)
    expect(typeof session.durationSecs).toBe('number')
  })

  it('complete throws SESSION_ALREADY_COMPLETED when not in_progress', () => {
    const session = ClinicalSession.create({ ...validProps, status: 'completed' })
    expect(() =>
      session.complete({
        submittedDiagnosis: 'IAM',
        submittedManagement: 'AAS',
        feedback: {},
        missedKeyExams: [],
      }),
    ).toThrow(DomainException)
  })

  it('abandon sets status to abandoned', () => {
    const session = ClinicalSession.create(validProps)
    session.abandon()
    expect(session.isAbandoned()).toBe(true)
  })

  it('creates with isTimed=true when provided', () => {
    const session = ClinicalSession.create({ ...validProps, isTimed: true, timedLimitSecs: 1800 })
    expect(session.isTimed).toBe(true)
    expect(session.timedLimitSecs).toBe(1800)
  })
})

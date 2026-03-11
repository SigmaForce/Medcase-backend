import { SessionStatus } from './session-status.vo'

describe('SessionStatus', () => {
  it('creates in_progress status', () => {
    const s = SessionStatus.create('in_progress')
    expect(s.value).toBe('in_progress')
    expect(s.isInProgress()).toBe(true)
    expect(s.isCompleted()).toBe(false)
    expect(s.isAbandoned()).toBe(false)
  })

  it('creates completed status', () => {
    const s = SessionStatus.create('completed')
    expect(s.isCompleted()).toBe(true)
    expect(s.isInProgress()).toBe(false)
  })

  it('creates abandoned status', () => {
    const s = SessionStatus.create('abandoned')
    expect(s.isAbandoned()).toBe(true)
  })

  it('uses factory shortcuts', () => {
    expect(SessionStatus.inProgress().value).toBe('in_progress')
    expect(SessionStatus.completed().value).toBe('completed')
    expect(SessionStatus.abandoned().value).toBe('abandoned')
  })

  it('throws INVALID_SESSION_STATUS for unknown value', () => {
    expect(() => SessionStatus.create('unknown')).toThrow()
    expect(() => SessionStatus.create('unknown')).toThrow(
      expect.objectContaining({ code: 'INVALID_SESSION_STATUS' }),
    )
  })
})

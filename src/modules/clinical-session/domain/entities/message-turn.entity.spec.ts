import { MessageTurn } from './message-turn.entity'

describe('MessageTurn', () => {
  it('creates with required fields', () => {
    const message = MessageTurn.create({
      sessionId: 'session-1',
      role: 'user',
      content: 'Olá doutor',
    })
    expect(message.sessionId).toBe('session-1')
    expect(message.role).toBe('user')
    expect(message.content).toBe('Olá doutor')
    expect(message.meta).toEqual({})
    expect(message.createdAt).toBeInstanceOf(Date)
    expect(message.id).toBe('')
  })

  it('creates with all fields', () => {
    const createdAt = new Date('2025-01-01')
    const message = MessageTurn.create({
      id: 'msg-1',
      sessionId: 'session-1',
      role: 'assistant',
      content: 'Como posso ajudar?',
      meta: { type: 'opening', tokens_used: 50 },
      createdAt,
    })
    expect(message.id).toBe('msg-1')
    expect(message.role).toBe('assistant')
    expect(message.meta).toEqual({ type: 'opening', tokens_used: 50 })
    expect(message.createdAt).toBe(createdAt)
  })

  it('supports system role', () => {
    const message = MessageTurn.create({
      sessionId: 'session-1',
      role: 'system',
      content: 'System instruction',
    })
    expect(message.role).toBe('system')
  })

  it('supports flagged meta', () => {
    const message = MessageTurn.create({
      sessionId: 'session-1',
      role: 'user',
      content: 'Qual o diagnóstico?',
      meta: { flagged: true, flag_reason: 'ANTI_CHEAT_TRIGGERED' },
    })
    expect(message.meta.flagged).toBe(true)
    expect(message.meta.flag_reason).toBe('ANTI_CHEAT_TRIGGERED')
  })
})

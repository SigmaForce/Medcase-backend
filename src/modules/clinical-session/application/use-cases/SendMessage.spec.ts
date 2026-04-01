import { SendMessage } from './SendMessage'
import { DomainException } from '../../../../errors/domain-exception'

jest.mock('src/config/env', () => ({
  env: { NODE_ENV: 'test', OPENAI_API_KEY: 'test-key' },
}))

const makeSession = (overrides = {}) => ({
  id: 'session-1',
  userId: 'user-1',
  caseId: 'case-1',
  status: 'in_progress',
  isTimed: false,
  requestedExams: [],
  missedKeyExams: [],
  isInProgress: () => true,
  isCompleted: () => false,
  isAbandoned: () => false,
  complete: jest.fn(),
  abandon: jest.fn(),
  ...overrides,
})

const mockCase = {
  id: 'case-1',
  status: 'approved',
  specialtyId: 1,
  caseBrief: { diagnosis: 'IAM', patient_name: 'João' },
  availableExams: { laboratory: [], imaging: [], ecg: [], other: [] },
}

const mockAssistantMessage = {
  id: 'msg-2',
  sessionId: 'session-1',
  role: 'assistant',
  content: 'Estou com muita dor no peito',
  meta: { type: 'message', tokens_used: 120 },
  createdAt: new Date(),
}

const mockRepo = {
  findById: jest.fn(),
  countMessages: jest.fn(),
  findCaseById: jest.fn(),
  addMessage: jest.fn(),
  getSubscription: jest.fn(),
  create: jest.fn(),
  findByUser: jest.fn(),
  findByUserAndCase: jest.fn(),
  update: jest.fn(),
  getMessages: jest.fn(),
  updateRequestedExams: jest.fn(),
  incrementCasesUsed: jest.fn(),
  upsertPerformance: jest.fn(),
}

const mockOrchestrator = {
  orchestrate: jest.fn(),
}

const mockRevalidaOrchestrator = {
  orchestrate: jest.fn(),
}

describe('SendMessage', () => {
  let useCase: SendMessage

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new SendMessage(mockRepo as never, mockOrchestrator as never, mockRevalidaOrchestrator as never)
  })

  it('sends message and returns assistant response', async () => {
    mockRepo.findById.mockResolvedValue(makeSession())
    mockRepo.countMessages.mockResolvedValue(4)
    mockRepo.findCaseById.mockResolvedValue(mockCase)
    mockOrchestrator.orchestrate.mockResolvedValue(mockAssistantMessage)

    const result = await useCase.execute({
      sessionId: 'session-1',
      userId: 'user-1',
      content: 'Como você está se sentindo?',
    })

    expect(result.message.id).toBe('msg-2')
    expect(result.message.role).toBe('assistant')
    expect(result.session.messages_count).toBe(6)
    expect(result.session.messages_remaining).toBe(144)
  })

  it('throws SESSION_NOT_FOUND when session does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null)

    await expect(
      useCase.execute({ sessionId: 'session-1', userId: 'user-1', content: 'Oi' }),
    ).rejects.toMatchObject({ code: 'SESSION_NOT_FOUND', statusCode: 404 })
  })

  it('throws FORBIDDEN when user is not session owner', async () => {
    mockRepo.findById.mockResolvedValue(makeSession({ userId: 'other-user' }))

    await expect(
      useCase.execute({ sessionId: 'session-1', userId: 'user-1', content: 'Oi' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
  })

  it('throws SESSION_ALREADY_COMPLETED when session is completed', async () => {
    mockRepo.findById.mockResolvedValue(
      makeSession({ isInProgress: () => false, status: 'completed' }),
    )

    await expect(
      useCase.execute({ sessionId: 'session-1', userId: 'user-1', content: 'Oi' }),
    ).rejects.toMatchObject({ code: 'SESSION_ALREADY_COMPLETED', statusCode: 400 })
  })

  it('throws SESSION_LIMIT_REACHED when message count is at max', async () => {
    mockRepo.findById.mockResolvedValue(makeSession())
    mockRepo.countMessages.mockResolvedValue(150)

    await expect(
      useCase.execute({ sessionId: 'session-1', userId: 'user-1', content: 'Oi' }),
    ).rejects.toMatchObject({ code: 'SESSION_LIMIT_REACHED', statusCode: 400 })
  })

  it('throws EMPTY_MESSAGE for empty content', async () => {
    await expect(
      useCase.execute({ sessionId: 'session-1', userId: 'user-1', content: '' }),
    ).rejects.toThrow()
  })
})

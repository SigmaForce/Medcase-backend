import { StartSession } from './StartSession'

jest.mock('src/config/env', () => ({
  env: { NODE_ENV: 'test', OPENAI_API_KEY: 'test-key' },
}))

const CASE_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'
const SESSION_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6'
const USER_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-a2b3c4d5e6f7'

const mockSubscription = {
  plan: 'free',
  casesLimit: 5,
  casesUsed: 2,
  usageResetAt: new Date('2025-04-01'),
}

const mockCase = {
  id: CASE_ID,
  status: 'approved',
  specialtyId: 1,
  caseBrief: {
    diagnosis: 'IAM',
    opening_message: 'Olá, estou com dor no peito',
    patient_name: 'João',
    patient_age: 55,
    patient_sex: 'masculino',
    patient_occupation: 'motorista',
  },
  availableExams: { laboratory: [], imaging: [], ecg: [], other: [] },
}

const mockSession = {
  id: SESSION_ID,
  userId: USER_ID,
  caseId: CASE_ID,
  status: 'in_progress',
  isTimed: false,
  timedLimitSecs: 2700,
  startedAt: new Date(),
  completedAt: null,
  durationSecs: null,
  requestedExams: [],
  missedKeyExams: [],
  submittedDiagnosis: null,
  submittedManagement: null,
  feedback: null,
  isInProgress: () => true,
  isCompleted: () => false,
  isAbandoned: () => false,
  complete: jest.fn(),
  abandon: jest.fn(),
}

const mockMessage = {
  id: 'd4e5f6a7-b8c9-4d0e-1f2a-b3c4d5e6f7a8',
  sessionId: SESSION_ID,
  role: 'assistant',
  content: 'Olá, estou com dor no peito',
  meta: { type: 'opening' },
  createdAt: new Date(),
}

const mockRepo = {
  getSubscription: jest.fn(),
  findCaseById: jest.fn(),
  findByUserAndCase: jest.fn(),
  incrementCasesUsed: jest.fn(),
  create: jest.fn(),
  addMessage: jest.fn(),
  findById: jest.fn(),
  findByUser: jest.fn(),
  update: jest.fn(),
  getMessages: jest.fn(),
  countMessages: jest.fn(),
  updateRequestedExams: jest.fn(),
  upsertPerformance: jest.fn(),
}

describe('StartSession', () => {
  let useCase: StartSession

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new StartSession(mockRepo as never)
  })

  it('creates session successfully', async () => {
    mockRepo.getSubscription.mockResolvedValue(mockSubscription)
    mockRepo.findCaseById.mockResolvedValue(mockCase)
    mockRepo.findByUserAndCase.mockResolvedValue(null)
    mockRepo.incrementCasesUsed.mockResolvedValue(undefined)
    mockRepo.create.mockResolvedValue(mockSession)
    mockRepo.addMessage.mockResolvedValue(mockMessage)

    const result = await useCase.execute({ userId: USER_ID, caseId: CASE_ID })

    expect(result.session.id).toBe(SESSION_ID)
    expect(result.session.messages).toHaveLength(1)
    expect(result.subscription.cases_used).toBe(3)
    expect(result.subscription.cases_remaining).toBe(2)
    expect(mockRepo.incrementCasesUsed).toHaveBeenCalledWith(USER_ID)
  })

  it('throws USAGE_LIMIT_REACHED when at limit', async () => {
    mockRepo.getSubscription.mockResolvedValue({ ...mockSubscription, casesUsed: 5 })

    await expect(useCase.execute({ userId: USER_ID, caseId: CASE_ID })).rejects.toMatchObject({
      code: 'USAGE_LIMIT_REACHED',
      statusCode: 403,
    })
  })

  it('throws SUBSCRIPTION_NOT_FOUND when no subscription', async () => {
    mockRepo.getSubscription.mockResolvedValue(null)

    await expect(useCase.execute({ userId: USER_ID, caseId: CASE_ID })).rejects.toMatchObject({
      code: 'SUBSCRIPTION_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws TIMED_MODE_REQUIRES_PRO for free user requesting timed session', async () => {
    mockRepo.getSubscription.mockResolvedValue({ ...mockSubscription, plan: 'free' })
    mockRepo.findCaseById.mockResolvedValue(mockCase)
    mockRepo.findByUserAndCase.mockResolvedValue(null)

    await expect(
      useCase.execute({ userId: USER_ID, caseId: CASE_ID, isTimed: true }),
    ).rejects.toMatchObject({ code: 'TIMED_MODE_REQUIRES_PRO', statusCode: 403 })
  })

  it('allows timed mode for pro user', async () => {
    mockRepo.getSubscription.mockResolvedValue({ ...mockSubscription, plan: 'pro' })
    mockRepo.findCaseById.mockResolvedValue(mockCase)
    mockRepo.findByUserAndCase.mockResolvedValue(null)
    mockRepo.incrementCasesUsed.mockResolvedValue(undefined)
    mockRepo.create.mockResolvedValue({ ...mockSession, isTimed: true })
    mockRepo.addMessage.mockResolvedValue(mockMessage)

    const result = await useCase.execute({ userId: USER_ID, caseId: CASE_ID, isTimed: true })
    expect(result.session.is_timed).toBe(true)
  })

  it('throws CASE_NOT_FOUND when case does not exist', async () => {
    mockRepo.getSubscription.mockResolvedValue(mockSubscription)
    mockRepo.findCaseById.mockResolvedValue(null)

    await expect(useCase.execute({ userId: USER_ID, caseId: CASE_ID })).rejects.toMatchObject({
      code: 'CASE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws CASE_NOT_FOUND when case is not approved', async () => {
    mockRepo.getSubscription.mockResolvedValue(mockSubscription)
    mockRepo.findCaseById.mockResolvedValue({ ...mockCase, status: 'draft' })

    await expect(useCase.execute({ userId: USER_ID, caseId: CASE_ID })).rejects.toMatchObject({
      code: 'CASE_NOT_FOUND',
    })
  })

  it('throws CASE_ALREADY_STARTED when active session exists', async () => {
    mockRepo.getSubscription.mockResolvedValue(mockSubscription)
    mockRepo.findCaseById.mockResolvedValue(mockCase)
    mockRepo.findByUserAndCase.mockResolvedValue(mockSession)

    await expect(useCase.execute({ userId: USER_ID, caseId: CASE_ID })).rejects.toMatchObject({
      code: 'CASE_ALREADY_STARTED',
      statusCode: 403,
    })
  })

  it('throws for invalid case_id UUID', async () => {
    await expect(
      useCase.execute({ userId: USER_ID, caseId: 'not-a-uuid' }),
    ).rejects.toThrow()
  })
})

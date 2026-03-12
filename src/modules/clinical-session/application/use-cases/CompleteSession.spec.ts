import { CompleteSession } from './CompleteSession'

jest.mock('src/config/env', () => ({
  env: { NODE_ENV: 'test', OPENAI_API_KEY: 'test-key' },
}))

const SESSION_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'
const USER_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-a2b3c4d5e6f7'
const OTHER_USER = 'd4e5f6a7-b8c9-4d0e-1f2a-b3c4d5e6f7a8'

const validInput = {
  sessionId: SESSION_ID,
  userId: USER_ID,
  submittedDiagnosis: 'Infarto Agudo do Miocárdio com supra ST',
  submittedManagement: 'AAS 300mg, heparina, cateterismo de urgência imediato',
}

const mockFeedback = {
  score_total: 80,
  correct_diagnosis: 'IAM',
  dimensions: {
    history_taking: { score: 80, analysis: 'Boa anamnese' },
    differential: { score: 75, analysis: 'Ok' },
    diagnosis: { score: 85, analysis: 'Correto' },
    exams: { score: 70, analysis: 'Faltou ECG' },
    management: { score: 90, analysis: 'Adequado' },
  },
}

const makeSession = (overrides?: Record<string, unknown>) => ({
  id: SESSION_ID,
  userId: USER_ID,
  caseId: 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6',
  status: 'in_progress',
  requestedExams: ['hemograma'],
  missedKeyExams: [],
  submittedDiagnosis: null,
  submittedManagement: null,
  feedback: null,
  isInProgress: jest.fn().mockReturnValue(true),
  complete: jest.fn(),
  ...overrides,
})

const mockCase = {
  id: 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6',
  status: 'approved',
  specialtyId: 1,
  caseBrief: {
    diagnosis: 'IAM',
    expected_management: 'AAS, heparina, cateterismo',
    key_findings: ['dor torácica', 'supra ST'],
  },
  availableExams: {
    laboratory: [{ slug: 'hemograma', name: 'Hemograma', result: '...', is_key: false, category: 'laboratory' }],
    imaging: [],
    ecg: [{ slug: 'ecg', name: 'ECG', result: '...', is_key: true, category: 'ecg' }],
    other: [],
  },
}

const mockSubscription = { plan: 'pro', casesLimit: 10, casesUsed: 1, usageResetAt: new Date() }

const mockRepo = {
  findById: jest.fn(),
  findCaseById: jest.fn(),
  getSubscription: jest.fn(),
  getMessages: jest.fn(),
  update: jest.fn(),
  upsertPerformance: jest.fn(),
}

const mockFeedbackGenerator = { generate: jest.fn() }
const mockPerformanceUpdater = { update: jest.fn() }
const mockStreakUpdater = { update: jest.fn() }
const mockBadgeAwarder = { award: jest.fn() }

const mockStreak = { userId: USER_ID, currentStreak: 1, longestStreak: 1, totalSessions: 1, lastActivityAt: new Date() }

describe('CompleteSession', () => {
  let useCase: CompleteSession

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CompleteSession(
      mockRepo as never,
      mockFeedbackGenerator as never,
      mockPerformanceUpdater as never,
      mockStreakUpdater as never,
      mockBadgeAwarder as never,
    )
  })

  it('completes session successfully and returns full feedback for pro user', async () => {
    const session = makeSession()
    mockRepo.findById.mockResolvedValue(session)
    mockRepo.findCaseById.mockResolvedValue(mockCase)
    mockRepo.getSubscription.mockResolvedValue(mockSubscription)
    mockRepo.getMessages.mockResolvedValue([])
    mockFeedbackGenerator.generate.mockResolvedValue(mockFeedback)
    mockRepo.update.mockResolvedValue({ ...session, status: 'completed', completedAt: new Date(), durationSecs: 120, missedKeyExams: ['ecg'] })
    mockPerformanceUpdater.update.mockResolvedValue(undefined)
    mockStreakUpdater.update.mockResolvedValue(mockStreak)
    mockBadgeAwarder.award.mockResolvedValue([])

    const result = await useCase.execute(validInput)

    expect(result.session.status).toBe('completed')
    expect(result.feedback).toHaveProperty('dimensions')
    expect(session.complete).toHaveBeenCalledTimes(1)
    expect(mockPerformanceUpdater.update).toHaveBeenCalledTimes(1)
    expect(mockStreakUpdater.update).toHaveBeenCalledWith({ userId: USER_ID })
    expect(mockBadgeAwarder.award).toHaveBeenCalledTimes(1)
  })

  it('returns only score_total and correct_diagnosis for free user', async () => {
    const session = makeSession()
    mockRepo.findById.mockResolvedValue(session)
    mockRepo.findCaseById.mockResolvedValue(mockCase)
    mockRepo.getSubscription.mockResolvedValue({ ...mockSubscription, plan: 'free' })
    mockRepo.getMessages.mockResolvedValue([])
    mockFeedbackGenerator.generate.mockResolvedValue(mockFeedback)
    mockRepo.update.mockResolvedValue({ ...session, status: 'completed', completedAt: new Date(), durationSecs: 120, missedKeyExams: [] })
    mockPerformanceUpdater.update.mockResolvedValue(undefined)
    mockStreakUpdater.update.mockResolvedValue(mockStreak)
    mockBadgeAwarder.award.mockResolvedValue([])

    const result = await useCase.execute(validInput)

    expect(result.feedback).toHaveProperty('score_total')
    expect(result.feedback).toHaveProperty('correct_diagnosis')
    expect(result.feedback).not.toHaveProperty('dimensions')
  })

  it('throws SESSION_NOT_FOUND when session does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute(validInput)).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws FORBIDDEN when user does not own session', async () => {
    mockRepo.findById.mockResolvedValue(makeSession())

    await expect(
      useCase.execute({ ...validInput, userId: OTHER_USER }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
  })

  it('throws SESSION_ALREADY_COMPLETED when session is not in progress', async () => {
    mockRepo.findById.mockResolvedValue(makeSession({ isInProgress: jest.fn().mockReturnValue(false) }))

    await expect(useCase.execute(validInput)).rejects.toMatchObject({
      code: 'SESSION_ALREADY_COMPLETED',
      statusCode: 400,
    })
  })

  it('throws DIAGNOSIS_TOO_SHORT when diagnosis is too short', async () => {
    await expect(
      useCase.execute({ ...validInput, submittedDiagnosis: 'Curto' }),
    ).rejects.toThrow()
  })

  it('throws MANAGEMENT_TOO_SHORT when management is too short', async () => {
    await expect(
      useCase.execute({ ...validInput, submittedManagement: 'Curto' }),
    ).rejects.toThrow()
  })
})

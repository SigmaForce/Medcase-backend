import { CompleteRevalidaSession } from './CompleteRevalidaSession'

jest.mock('src/config/env', () => ({
  env: { NODE_ENV: 'test', OPENAI_API_KEY: 'test-key' },
}))

const SESSION_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'
const USER_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-a2b3c4d5e6f7'
const OTHER_USER = 'd4e5f6a7-b8c9-4d0e-1f2a-b3c4d5e6f7a8'

const validInput = {
  sessionId: SESSION_ID,
  userId: USER_ID,
  submittedDiagnosis: 'Insuficiência Cardíaca Descompensada com edema agudo de pulmão',
  submittedManagement: 'Furosemida IV, oxigenioterapia, monitorização contínua e restrição hídrica',
}

const mockFeedback = {
  score_total: 75,
  max_score_total: 100,
  correct_diagnosis: true,
  strengths: ['Boa anamnese orientada ao queixo principal', 'Diagnóstico correto'],
  improvements: ['Poderia ter solicitado ECG mais precocemente'],
  dimensions: {
    history_taking: { score: 80, analysis: 'Boa anamnese' },
    differential: { score: 70, analysis: 'Ok' },
    diagnosis: { score: 85, analysis: 'Correto' },
    exams: { score: 60, analysis: 'Faltou ECG' },
    management: { score: 80, analysis: 'Adequado' },
  },
}

const makeSession = (overrides: Record<string, unknown> = {}) => ({
  id: SESSION_ID,
  userId: USER_ID,
  caseId: 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6',
  status: 'in_progress',
  sessionType: 'revalida',
  requestedExams: [],
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
  specialtyId: 2,
  caseBrief: {
    diagnosis: 'IC Descompensada',
    expected_management: 'Furosemida IV, oxigenioterapia',
    teaching_points: ['BNP é marcador de IC'],
    pep: [
      { step: 'Anamnese', points: 20 },
      { step: 'Diagnóstico', points: 30 },
      { step: 'Conduta', points: 50 },
    ],
  },
  availableExams: {
    laboratory: [{ slug: 'bnp', name: 'BNP', result: 'Elevado', is_key: true, category: 'laboratory' }],
    imaging: [],
    ecg: [],
    other: [],
  },
}

const mockSubscriptionPro = { plan: 'pro', casesLimit: 10, casesUsed: 3, usageResetAt: new Date() }
const mockSubscriptionFree = { plan: 'free', casesLimit: 5, casesUsed: 3, usageResetAt: new Date() }

const mockRepo = {
  findById: jest.fn(),
  findCaseById: jest.fn(),
  getSubscription: jest.fn(),
  getMessages: jest.fn(),
  update: jest.fn(),
}

const mockFeedbackGenerator = { generate: jest.fn() }
const mockPerformanceUpdater = { update: jest.fn() }
const mockStreakUpdater = { update: jest.fn() }
const mockBadgeAwarder = { award: jest.fn() }

const mockStreak = { userId: USER_ID, currentStreak: 2, longestStreak: 2, totalSessions: 5, lastActivityAt: new Date() }

describe('CompleteRevalidaSession', () => {
  let useCase: CompleteRevalidaSession

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CompleteRevalidaSession(
      mockRepo as never,
      mockFeedbackGenerator as never,
      mockPerformanceUpdater as never,
      mockStreakUpdater as never,
      mockBadgeAwarder as never,
    )
  })

  const setupHappyPath = (plan = 'pro') => {
    const session = makeSession()
    mockRepo.findById.mockResolvedValue(session)
    mockRepo.findCaseById.mockResolvedValue(mockCase)
    mockRepo.getSubscription.mockResolvedValue(plan === 'pro' ? mockSubscriptionPro : mockSubscriptionFree)
    mockRepo.getMessages.mockResolvedValue([])
    mockFeedbackGenerator.generate.mockResolvedValue(mockFeedback)
    mockRepo.update.mockResolvedValue({
      ...session,
      status: 'completed',
      completedAt: new Date(),
      durationSecs: 480,
    })
    mockPerformanceUpdater.update.mockResolvedValue(undefined)
    mockStreakUpdater.update.mockResolvedValue(mockStreak)
    mockBadgeAwarder.award.mockResolvedValue([])
    return session
  }

  it('completes revalida session successfully and returns full feedback for pro user', async () => {
    const session = setupHappyPath('pro')

    const result = await useCase.execute(validInput)

    expect(result.session.status).toBe('completed')
    expect(result.feedback).toHaveProperty('dimensions')
    expect(result.feedback).toHaveProperty('strengths')
    expect(result.feedback).toHaveProperty('improvements')
    expect(result.subscription_plan).toBe('pro')
    expect(session.complete).toHaveBeenCalledTimes(1)
    expect(mockPerformanceUpdater.update).toHaveBeenCalledTimes(1)
    expect(mockStreakUpdater.update).toHaveBeenCalledWith({ userId: USER_ID })
    expect(mockBadgeAwarder.award).toHaveBeenCalledTimes(1)
  })

  it('returns limited feedback for free user (score, diagnosis, 1 strength, 1 improvement)', async () => {
    setupHappyPath('free')

    const result = await useCase.execute(validInput)

    expect(result.feedback).toHaveProperty('score_total')
    expect(result.feedback).toHaveProperty('max_score_total')
    expect(result.feedback).toHaveProperty('correct_diagnosis')
    expect((result.feedback.strengths as string[]).length).toBe(1)
    expect((result.feedback.improvements as string[]).length).toBe(1)
    expect(result.feedback).not.toHaveProperty('dimensions')
    expect(result.subscription_plan).toBe('free')
  })

  it('throws SESSION_NOT_FOUND when session does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute(validInput)).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws FORBIDDEN when user does not own the session', async () => {
    mockRepo.findById.mockResolvedValue(makeSession())

    await expect(
      useCase.execute({ ...validInput, userId: OTHER_USER }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
  })

  it('throws SESSION_ALREADY_COMPLETED when session is not in progress', async () => {
    mockRepo.findById.mockResolvedValue(
      makeSession({ isInProgress: jest.fn().mockReturnValue(false) }),
    )

    await expect(useCase.execute(validInput)).rejects.toMatchObject({
      code: 'SESSION_ALREADY_COMPLETED',
      statusCode: 400,
    })
  })

  it('throws NOT_A_REVALIDA_SESSION when sessionType is not revalida', async () => {
    mockRepo.findById.mockResolvedValue(makeSession({ sessionType: 'study' }))

    await expect(useCase.execute(validInput)).rejects.toMatchObject({
      code: 'NOT_A_REVALIDA_SESSION',
      statusCode: 400,
    })
  })

  it('throws SUBSCRIPTION_NOT_FOUND when user has no subscription', async () => {
    mockRepo.findById.mockResolvedValue(makeSession())
    mockRepo.findCaseById.mockResolvedValue(mockCase)
    mockRepo.getSubscription.mockResolvedValue(null)

    await expect(useCase.execute(validInput)).rejects.toMatchObject({
      code: 'SUBSCRIPTION_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws CASE_MISSING_PEP when case has empty pep array', async () => {
    mockRepo.findById.mockResolvedValue(makeSession())
    mockRepo.findCaseById.mockResolvedValue({
      ...mockCase,
      caseBrief: { ...mockCase.caseBrief, pep: [] },
    })
    mockRepo.getSubscription.mockResolvedValue(mockSubscriptionPro)

    await expect(useCase.execute(validInput)).rejects.toMatchObject({
      code: 'CASE_MISSING_PEP',
      statusCode: 422,
    })
  })
})

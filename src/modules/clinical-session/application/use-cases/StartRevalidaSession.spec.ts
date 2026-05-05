import { StartRevalidaSession } from './StartRevalidaSession'

const CASE_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'
const SESSION_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6'
const USER_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-a2b3c4d5e6f7'

const makeProSubscription = (overrides: Record<string, unknown> = {}) => ({
  plan: 'pro',
  casesLimit: 999,
  casesUsed: 5,
  usageResetAt: new Date('2026-04-30'),
  ...overrides,
})

const STATION_INSTRUCTIONS =
  'Você está em uma Unidade Básica de Saúde. Irá atender um homem de 65 anos que consulta por dificuldade respiratória. Em 10 minutos você deve: realizar a anamnese, solicitar os exames que julgar necessários, estabelecer o diagnóstico provável e propor o tratamento adequado.'

const makeRevalidaCase = (overrides: Record<string, unknown> = {}) => ({
  id: CASE_ID,
  status: 'approved',
  caseBrief: {
    patient_script: {
      chief_complaint: { dor: 'Dor no peito há 2 dias' },
      associated_symptoms: {},
      history: {},
    },
    pep: [{ step: 'Anamnese', points: 10 }],
    opening_message: 'Olá, pode me ajudar?',
    station_instructions: STATION_INSTRUCTIONS,
  },
  availableExams: { laboratory: [], imaging: [], ecg: [], other: [] },
  ...overrides,
})

const makeSession = () => ({
  id: SESSION_ID,
  userId: USER_ID,
  caseId: CASE_ID,
  status: 'in_progress',
  sessionType: 'revalida',
  isTimed: true,
  timedLimitSecs: 600,
  startedAt: new Date(),
  completedAt: null,
  durationSecs: null,
  requestedExams: [],
  isInProgress: () => true,
  isCompleted: () => false,
  isAbandoned: () => false,
  complete: jest.fn(),
  abandon: jest.fn(),
})

const makeMessage = () => ({
  id: 'd4e5f6a7-b8c9-4d0e-1f2a-b3c4d5e6f7a8',
  sessionId: SESSION_ID,
  role: 'assistant',
  content: 'Olá, pode me ajudar?',
  meta: { type: 'opening' },
  createdAt: new Date(),
})

const mockRepo = {
  getSubscription: jest.fn(),
  findCaseById: jest.fn(),
  findInProgressByUserAndCase: jest.fn(),
  incrementCasesUsedIfAllowed: jest.fn(),
  create: jest.fn(),
  addMessage: jest.fn(),
  findById: jest.fn(),
  findByUserAndCase: jest.fn(),
  findByUser: jest.fn(),
  update: jest.fn(),
  getMessages: jest.fn(),
  countMessages: jest.fn(),
  updateRequestedExams: jest.fn(),
  upsertPerformance: jest.fn(),
}

describe('StartRevalidaSession', () => {
  let useCase: StartRevalidaSession

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new StartRevalidaSession(mockRepo as never)
  })

  it('creates revalida session successfully', async () => {
    mockRepo.getSubscription.mockResolvedValue(makeProSubscription())
    mockRepo.findCaseById.mockResolvedValue(makeRevalidaCase())
    mockRepo.findInProgressByUserAndCase.mockResolvedValue(null)
    mockRepo.incrementCasesUsedIfAllowed.mockResolvedValue(true)
    mockRepo.create.mockResolvedValue(makeSession())
    mockRepo.addMessage.mockResolvedValue(makeMessage())

    const result = await useCase.execute({ userId: USER_ID, caseId: CASE_ID })

    expect(result.session.id).toBe(SESSION_ID)
    expect(result.session.session_type).toBe('revalida')
    expect(result.session.is_timed).toBe(true)
    expect(result.session.timed_limit_secs).toBe(600)
    expect(result.session.station_instructions).toBe(STATION_INSTRUCTIONS)
    expect(result.session.messages).toHaveLength(1)
    expect(result.session.messages[0].content).toBe('Olá, pode me ajudar?')
    expect(result.subscription.cases_used).toBe(6)
    expect(result.subscription.cases_remaining).toBe(993)
  })

  it('increments casesUsed after success', async () => {
    mockRepo.getSubscription.mockResolvedValue(makeProSubscription())
    mockRepo.findCaseById.mockResolvedValue(makeRevalidaCase())
    mockRepo.findInProgressByUserAndCase.mockResolvedValue(null)
    mockRepo.incrementCasesUsedIfAllowed.mockResolvedValue(true)
    mockRepo.create.mockResolvedValue(makeSession())
    mockRepo.addMessage.mockResolvedValue(makeMessage())

    await useCase.execute({ userId: USER_ID, caseId: CASE_ID })

    expect(mockRepo.incrementCasesUsedIfAllowed).toHaveBeenCalledWith(USER_ID)
  })

  it('returns correct cases_remaining', async () => {
    mockRepo.getSubscription.mockResolvedValue(makeProSubscription({ casesLimit: 10, casesUsed: 7 }))
    mockRepo.findCaseById.mockResolvedValue(makeRevalidaCase())
    mockRepo.findInProgressByUserAndCase.mockResolvedValue(null)
    mockRepo.incrementCasesUsedIfAllowed.mockResolvedValue(true)
    mockRepo.create.mockResolvedValue(makeSession())
    mockRepo.addMessage.mockResolvedValue(makeMessage())

    const result = await useCase.execute({ userId: USER_ID, caseId: CASE_ID })

    // remaining = max(0, casesLimit - (casesUsed + 1)) = max(0, 10 - 8) = 2
    expect(result.subscription.cases_remaining).toBe(2)
  })

  it('returns 0 cases_remaining when at limit after increment', async () => {
    mockRepo.getSubscription.mockResolvedValue(makeProSubscription({ casesLimit: 5, casesUsed: 4 }))
    mockRepo.findCaseById.mockResolvedValue(makeRevalidaCase())
    mockRepo.findInProgressByUserAndCase.mockResolvedValue(null)
    mockRepo.incrementCasesUsedIfAllowed.mockResolvedValue(true)
    mockRepo.create.mockResolvedValue(makeSession())
    mockRepo.addMessage.mockResolvedValue(makeMessage())

    const result = await useCase.execute({ userId: USER_ID, caseId: CASE_ID })

    expect(result.subscription.cases_remaining).toBe(0)
  })

  it('throws SUBSCRIPTION_NOT_FOUND when no subscription', async () => {
    mockRepo.getSubscription.mockResolvedValue(null)

    await expect(useCase.execute({ userId: USER_ID, caseId: CASE_ID })).rejects.toMatchObject({
      code: 'SUBSCRIPTION_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws USAGE_LIMIT_REACHED when incrementCasesUsedIfAllowed returns false', async () => {
    mockRepo.getSubscription.mockResolvedValue(makeProSubscription({ casesLimit: 5, casesUsed: 3 }))
    mockRepo.findCaseById.mockResolvedValue(makeRevalidaCase())
    mockRepo.findInProgressByUserAndCase.mockResolvedValue(null)
    mockRepo.incrementCasesUsedIfAllowed.mockResolvedValue(false)

    await expect(useCase.execute({ userId: USER_ID, caseId: CASE_ID })).rejects.toMatchObject({
      code: 'USAGE_LIMIT_REACHED',
      statusCode: 403,
    })
  })

  it('creates revalida session successfully for free plan', async () => {
    mockRepo.getSubscription.mockResolvedValue(makeProSubscription({ plan: 'free', casesLimit: 5, casesUsed: 2 }))
    mockRepo.findCaseById.mockResolvedValue(makeRevalidaCase())
    mockRepo.findInProgressByUserAndCase.mockResolvedValue(null)
    mockRepo.incrementCasesUsedIfAllowed.mockResolvedValue(true)
    mockRepo.create.mockResolvedValue(makeSession())
    mockRepo.addMessage.mockResolvedValue(makeMessage())

    const result = await useCase.execute({ userId: USER_ID, caseId: CASE_ID })

    expect(result.session.session_type).toBe('revalida')
    expect(result.subscription.cases_remaining).toBe(2)
  })

  it('throws CASE_NOT_FOUND when case does not exist', async () => {
    mockRepo.getSubscription.mockResolvedValue(makeProSubscription())
    mockRepo.findCaseById.mockResolvedValue(null)

    await expect(useCase.execute({ userId: USER_ID, caseId: CASE_ID })).rejects.toMatchObject({
      code: 'CASE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws CASE_NOT_FOUND when case is not approved', async () => {
    mockRepo.getSubscription.mockResolvedValue(makeProSubscription())
    mockRepo.findCaseById.mockResolvedValue(makeRevalidaCase({ status: 'draft' }))

    await expect(useCase.execute({ userId: USER_ID, caseId: CASE_ID })).rejects.toMatchObject({
      code: 'CASE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws CASE_NOT_REVALIDA_FORMAT when patient_script is missing', async () => {
    mockRepo.getSubscription.mockResolvedValue(makeProSubscription())
    mockRepo.findCaseById.mockResolvedValue(
      makeRevalidaCase({ caseBrief: { pep: [{ step: 'Anamnese', points: 10 }] } }),
    )

    await expect(useCase.execute({ userId: USER_ID, caseId: CASE_ID })).rejects.toMatchObject({
      code: 'CASE_NOT_REVALIDA_FORMAT',
      statusCode: 422,
    })
  })

  it('throws CASE_NOT_REVALIDA_FORMAT when pep is missing', async () => {
    mockRepo.getSubscription.mockResolvedValue(makeProSubscription())
    mockRepo.findCaseById.mockResolvedValue(
      makeRevalidaCase({
        caseBrief: {
          patient_script: { chief_complaint: {}, associated_symptoms: {}, history: {} },
        },
      }),
    )

    await expect(useCase.execute({ userId: USER_ID, caseId: CASE_ID })).rejects.toMatchObject({
      code: 'CASE_NOT_REVALIDA_FORMAT',
      statusCode: 422,
    })
  })

  it('throws CASE_ALREADY_IN_PROGRESS when session is in progress', async () => {
    mockRepo.getSubscription.mockResolvedValue(makeProSubscription())
    mockRepo.findCaseById.mockResolvedValue(makeRevalidaCase())
    mockRepo.findInProgressByUserAndCase.mockResolvedValue(makeSession())

    await expect(useCase.execute({ userId: USER_ID, caseId: CASE_ID })).rejects.toMatchObject({
      code: 'CASE_ALREADY_IN_PROGRESS',
      statusCode: 403,
    })
  })

  it('returns empty station_instructions when field is absent in caseBrief', async () => {
    const caseWithoutInstructions = makeRevalidaCase({
      caseBrief: {
        patient_script: { chief_complaint: {}, associated_symptoms: {}, history: {} },
        pep: [{ step: 'Anamnese', points: 10 }],
        opening_message: 'Olá, pode me ajudar?',
        // station_instructions absent
      },
    })
    mockRepo.getSubscription.mockResolvedValue(makeProSubscription())
    mockRepo.findCaseById.mockResolvedValue(caseWithoutInstructions)
    mockRepo.findInProgressByUserAndCase.mockResolvedValue(null)
    mockRepo.incrementCasesUsedIfAllowed.mockResolvedValue(true)
    mockRepo.create.mockResolvedValue(makeSession())
    mockRepo.addMessage.mockResolvedValue(makeMessage())

    const result = await useCase.execute({ userId: USER_ID, caseId: CASE_ID })

    expect(result.session.station_instructions).toBe('')
  })

  it('throws for invalid case_id UUID', async () => {
    await expect(
      useCase.execute({ userId: USER_ID, caseId: 'not-a-valid-uuid' }),
    ).rejects.toThrow()
  })
})

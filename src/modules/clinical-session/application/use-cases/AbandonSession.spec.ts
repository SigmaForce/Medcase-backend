import { AbandonSession } from './AbandonSession'

const SESSION_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5'
const USER_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-a2b3c4d5e6f7'
const OTHER_USER = 'd4e5f6a7-b8c9-4d0e-1f2a-b3c4d5e6f7a8'

const makeSession = (overrides?: Record<string, unknown>) => ({
  id: SESSION_ID,
  userId: USER_ID,
  caseId: 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6',
  status: 'in_progress',
  isTimed: false,
  startedAt: new Date(),
  completedAt: null,
  durationSecs: null,
  requestedExams: [],
  missedKeyExams: [],
  submittedDiagnosis: null,
  submittedManagement: null,
  feedback: null,
  isInProgress: jest.fn().mockReturnValue(true),
  isCompleted: jest.fn().mockReturnValue(false),
  isAbandoned: jest.fn().mockReturnValue(false),
  complete: jest.fn(),
  abandon: jest.fn(),
  ...overrides,
})

const mockRepo = {
  findById: jest.fn(),
  update: jest.fn(),
}

describe('AbandonSession', () => {
  let useCase: AbandonSession

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new AbandonSession(mockRepo as never)
  })

  it('abandons an in-progress session successfully', async () => {
    const session = makeSession()
    mockRepo.findById.mockResolvedValue(session)
    mockRepo.update.mockResolvedValue({ ...session, status: 'abandoned' })

    const result = await useCase.execute({ sessionId: SESSION_ID, userId: USER_ID })

    expect(session.abandon).toHaveBeenCalledTimes(1)
    expect(mockRepo.update).toHaveBeenCalledWith(session)
    expect(result.session.status).toBe('abandoned')
  })

  it('throws SESSION_NOT_FOUND when session does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute({ sessionId: SESSION_ID, userId: USER_ID })).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws FORBIDDEN when user does not own session', async () => {
    mockRepo.findById.mockResolvedValue(makeSession())

    await expect(
      useCase.execute({ sessionId: SESSION_ID, userId: OTHER_USER }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
  })

  it('throws SESSION_ALREADY_COMPLETED when session is not in progress', async () => {
    const session = makeSession({ isInProgress: jest.fn().mockReturnValue(false) })
    mockRepo.findById.mockResolvedValue(session)

    await expect(useCase.execute({ sessionId: SESSION_ID, userId: USER_ID })).rejects.toMatchObject({
      code: 'SESSION_ALREADY_COMPLETED',
      statusCode: 400,
    })
  })
})

import { GetSession } from './GetSession'

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
  ...overrides,
})

const makeMessage = (idx: number) => ({
  id: `msg-${idx}`,
  sessionId: SESSION_ID,
  role: 'user',
  content: `Message ${idx}`,
  meta: {},
  createdAt: new Date(),
})

const mockRepo = {
  findById: jest.fn(),
  getMessages: jest.fn(),
}

describe('GetSession', () => {
  let useCase: GetSession

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GetSession(mockRepo as never)
  })

  it('returns session with messages for owner', async () => {
    const messages = [makeMessage(1), makeMessage(2)]
    mockRepo.findById.mockResolvedValue(makeSession())
    mockRepo.getMessages.mockResolvedValue(messages)

    const result = await useCase.execute({ sessionId: SESSION_ID, userId: USER_ID })

    expect(result.session.id).toBe(SESSION_ID)
    expect(result.session.messages).toHaveLength(2)
    expect(mockRepo.getMessages).toHaveBeenCalledWith(SESSION_ID)
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

  it('maps all session fields correctly', async () => {
    const session = makeSession({ isTimed: true, requestedExams: ['hemograma'] })
    mockRepo.findById.mockResolvedValue(session)
    mockRepo.getMessages.mockResolvedValue([])

    const result = await useCase.execute({ sessionId: SESSION_ID, userId: USER_ID })

    expect(result.session.is_timed).toBe(true)
    expect(result.session.requested_exams).toEqual(['hemograma'])
    expect(result.session.messages).toEqual([])
  })
})

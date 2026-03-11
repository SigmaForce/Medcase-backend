import { ListSessions } from './ListSessions'

const USER_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-a2b3c4d5e6f7'

const makeSession = (idx: number, status = 'in_progress') => ({
  id: `session-${idx}`,
  userId: USER_ID,
  caseId: `case-${idx}`,
  status,
  isTimed: false,
  startedAt: new Date(),
  completedAt: null,
  durationSecs: null,
  requestedExams: [],
  missedKeyExams: [],
  submittedDiagnosis: null,
  submittedManagement: null,
  feedback: null,
})

const mockRepo = { findByUser: jest.fn() }

describe('ListSessions', () => {
  let useCase: ListSessions

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ListSessions(mockRepo as never)
  })

  it('returns paginated sessions for user', async () => {
    const sessions = [makeSession(1), makeSession(2)]
    mockRepo.findByUser.mockResolvedValue({ sessions, total: 2 })

    const result = await useCase.execute({ userId: USER_ID })

    expect(result.sessions).toHaveLength(2)
    expect(result.pagination.total).toBe(2)
    expect(result.pagination.page).toBe(1)
    expect(result.pagination.limit).toBe(20)
    expect(mockRepo.findByUser).toHaveBeenCalledWith(USER_ID, { status: undefined, page: 1, limit: 20 })
  })

  it('filters by status', async () => {
    mockRepo.findByUser.mockResolvedValue({ sessions: [], total: 0 })

    await useCase.execute({ userId: USER_ID, status: 'completed', page: 2, limit: 10 })

    expect(mockRepo.findByUser).toHaveBeenCalledWith(USER_ID, { status: 'completed', page: 2, limit: 10 })
  })

  it('throws INVALID_SESSION_STATUS for unknown status', async () => {
    await expect(
      useCase.execute({ userId: USER_ID, status: 'unknown' }),
    ).rejects.toMatchObject({ code: 'INVALID_SESSION_STATUS', statusCode: 400 })
  })

  it('calculates total_pages correctly', async () => {
    mockRepo.findByUser.mockResolvedValue({ sessions: [], total: 45 })

    const result = await useCase.execute({ userId: USER_ID, limit: 20 })

    expect(result.pagination.total_pages).toBe(3)
  })

  it('clamps limit between 1 and 100', async () => {
    mockRepo.findByUser.mockResolvedValue({ sessions: [], total: 0 })

    await useCase.execute({ userId: USER_ID, limit: 999 })

    expect(mockRepo.findByUser).toHaveBeenCalledWith(USER_ID, expect.objectContaining({ limit: 100 }))
  })
})

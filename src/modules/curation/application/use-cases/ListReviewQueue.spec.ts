import { ListReviewQueue } from './ListReviewQueue'

const mockQueueRepo = { list: jest.fn() }

describe('ListReviewQueue', () => {
  let useCase: ListReviewQueue

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ListReviewQueue(mockQueueRepo as never)
  })

  it('throws FORBIDDEN when role is student', async () => {
    await expect(
      useCase.execute({ role: 'student', page: 1, limit: 20 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
  })

  it('returns paginated list for reviewer', async () => {
    const mockResult = { data: [{ id: 'q1', caseId: 'c1', status: 'pending' }], meta: { page: 1, limit: 20, total: 1 } }
    mockQueueRepo.list.mockResolvedValue(mockResult)

    const result = await useCase.execute({ role: 'reviewer', page: 1, limit: 20 })

    expect(result.data).toHaveLength(1)
    expect(mockQueueRepo.list).toHaveBeenCalledWith({ page: 1, limit: 20, status: undefined })
  })

  it('returns paginated list for admin', async () => {
    mockQueueRepo.list.mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0 } })
    const result = await useCase.execute({ role: 'admin', page: 1, limit: 20 })
    expect(result.meta.total).toBe(0)
  })
})

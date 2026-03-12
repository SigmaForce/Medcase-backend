import { ApproveQueueItem } from './ApproveQueueItem'

const mockQueueRepo = { findById: jest.fn(), update: jest.fn() }
const mockCaseRepo = { findById: jest.fn(), update: jest.fn() }

const makeItem = (overrides = {}) => ({
  id: 'q1', caseId: 'case-1', status: 'pending', regenerations: 0, reviewedById: null, reviewedAt: null,
  createdAt: new Date(), updatedAt: new Date(), canRegenerate: () => true,
  ...overrides,
})
const makeCase = (overrides = {}) => ({ id: 'case-1', status: 'pending_review', avgRating: 2.5, totalRatings: 5, ...overrides })

describe('ApproveQueueItem', () => {
  let useCase: ApproveQueueItem

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ApproveQueueItem(mockQueueRepo as never, mockCaseRepo as never)
  })

  it('throws FORBIDDEN when role is student', async () => {
    await expect(useCase.execute({ itemId: 'q1', userId: 'u1', role: 'student' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('throws QUEUE_ITEM_NOT_FOUND when item does not exist', async () => {
    mockQueueRepo.findById.mockResolvedValue(null)
    await expect(useCase.execute({ itemId: 'q1', userId: 'u1', role: 'reviewer' })).rejects.toMatchObject({ code: 'QUEUE_ITEM_NOT_FOUND' })
  })

  it('throws QUEUE_ITEM_NOT_PENDING when item is already resolved', async () => {
    mockQueueRepo.findById.mockResolvedValue(makeItem({ status: 'approved' }))
    await expect(useCase.execute({ itemId: 'q1', userId: 'u1', role: 'reviewer' })).rejects.toMatchObject({ code: 'QUEUE_ITEM_NOT_PENDING' })
  })

  it('approves item and sets case to approved', async () => {
    const item = makeItem()
    mockQueueRepo.findById.mockResolvedValue(item)
    mockQueueRepo.update.mockResolvedValue({ ...item, status: 'approved' })
    mockCaseRepo.findById.mockResolvedValue(makeCase())
    mockCaseRepo.update.mockResolvedValue(makeCase({ status: 'approved' }))

    const result = await useCase.execute({ itemId: 'q1', userId: 'reviewer-1', role: 'reviewer' })

    expect(result.queueItem.status).toBe('approved')
    expect(result.case.status).toBe('approved')
    expect(item.reviewedById).toBe('reviewer-1')
    expect(item.reviewedAt).toBeInstanceOf(Date)
  })
})

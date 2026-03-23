import { RejectQueueItem } from './RejectQueueItem'

const mockQueueRepo = { findById: jest.fn(), update: jest.fn() }
const mockCaseRepo = { findById: jest.fn(), update: jest.fn() }

const makeItem = (overrides = {}) => ({
  id: 'q1', caseId: 'case-1', status: 'pending', regenerations: 0, reviewedById: null, reviewedAt: null,
  createdAt: new Date(), updatedAt: new Date(), canRegenerate: () => true,
  ...overrides,
})
const makeCase = (overrides = {}) => ({ id: 'case-1', status: 'pending_review', avgRating: 2.5, totalRatings: 5, ...overrides })

const mockEventEmitter = { emit: jest.fn() }

describe('RejectQueueItem', () => {
  let useCase: RejectQueueItem

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new RejectQueueItem(mockQueueRepo as never, mockCaseRepo as never, mockEventEmitter as never)
  })

  it('throws FORBIDDEN when role is student', async () => {
    await expect(useCase.execute({ itemId: 'q1', userId: 'u1', role: 'student' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('throws QUEUE_ITEM_NOT_FOUND when item does not exist', async () => {
    mockQueueRepo.findById.mockResolvedValue(null)
    await expect(useCase.execute({ itemId: 'q1', userId: 'u1', role: 'admin' })).rejects.toMatchObject({ code: 'QUEUE_ITEM_NOT_FOUND' })
  })

  it('throws QUEUE_ITEM_NOT_PENDING when item is not pending', async () => {
    mockQueueRepo.findById.mockResolvedValue(makeItem({ status: 'rejected' }))
    await expect(useCase.execute({ itemId: 'q1', userId: 'u1', role: 'admin' })).rejects.toMatchObject({ code: 'QUEUE_ITEM_NOT_PENDING' })
  })

  it('rejects item and sets case to rejected', async () => {
    const item = makeItem()
    mockQueueRepo.findById.mockResolvedValue(item)
    mockQueueRepo.update.mockResolvedValue({ ...item, status: 'rejected' })
    mockCaseRepo.findById.mockResolvedValue(makeCase())
    mockCaseRepo.update.mockResolvedValue(makeCase({ status: 'rejected' }))

    const result = await useCase.execute({ itemId: 'q1', userId: 'admin-1', role: 'admin' })

    expect(result.queueItem.status).toBe('rejected')
    expect(result.case.status).toBe('rejected')
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('case.rejected', expect.objectContaining({ caseId: 'case-1' }))
  })
})

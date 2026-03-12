import { SubmitRating } from './SubmitRating'
import { DomainException } from '../../../../errors/domain-exception'

jest.mock('src/config/env', () => ({ env: { NODE_ENV: 'test' } }))

const CASE_ID = 'case-uuid-1234'
const USER_ID = 'user-uuid-5678'

const makeCase = (overrides = {}) => ({
  id: CASE_ID,
  status: 'approved',
  avgRating: 4,
  totalRatings: 2,
  ...overrides,
})

const mockCaseRepo = { findById: jest.fn(), update: jest.fn() }
const mockRatingRepo = { findByUserAndCase: jest.fn(), create: jest.fn(), countByCase: jest.fn(), avgByCase: jest.fn() }
const mockQueueRepo = { create: jest.fn(), findByCaseId: jest.fn(), findById: jest.fn(), list: jest.fn(), update: jest.fn() }
const mockSessionRepo = { findCompletedByUserAndCase: jest.fn() }

const validInput = { caseId: CASE_ID, userId: USER_ID, score: 4, issues: [], comment: undefined }

describe('SubmitRating', () => {
  let useCase: SubmitRating

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new SubmitRating(
      mockCaseRepo as never,
      mockRatingRepo as never,
      mockQueueRepo as never,
      mockSessionRepo as never,
    )
  })

  it('throws CASE_NOT_FOUND when case does not exist', async () => {
    mockCaseRepo.findById.mockResolvedValue(null)
    await expect(useCase.execute(validInput)).rejects.toMatchObject({ code: 'CASE_NOT_FOUND', statusCode: 404 })
  })

  it('throws CASE_NOT_AVAILABLE when case is not approved', async () => {
    mockCaseRepo.findById.mockResolvedValue(makeCase({ status: 'pending_review' }))
    await expect(useCase.execute(validInput)).rejects.toMatchObject({ code: 'CASE_NOT_AVAILABLE', statusCode: 403 })
  })

  it('throws SESSION_NOT_COMPLETED when user has no completed session', async () => {
    mockCaseRepo.findById.mockResolvedValue(makeCase())
    mockSessionRepo.findCompletedByUserAndCase.mockResolvedValue(false)
    await expect(useCase.execute(validInput)).rejects.toMatchObject({ code: 'SESSION_NOT_COMPLETED', statusCode: 403 })
  })

  it('throws ALREADY_RATED when user already rated', async () => {
    mockCaseRepo.findById.mockResolvedValue(makeCase())
    mockSessionRepo.findCompletedByUserAndCase.mockResolvedValue(true)
    mockRatingRepo.findByUserAndCase.mockResolvedValue({ id: 'existing' })
    await expect(useCase.execute(validInput)).rejects.toMatchObject({ code: 'ALREADY_RATED', statusCode: 409 })
  })

  it('saves rating and updates case avg on success (score 5)', async () => {
    mockCaseRepo.findById.mockResolvedValue(makeCase())
    mockSessionRepo.findCompletedByUserAndCase.mockResolvedValue(true)
    mockRatingRepo.findByUserAndCase.mockResolvedValue(null)
    mockRatingRepo.create.mockResolvedValue({ id: 'new-rating', caseId: CASE_ID, score: 5, createdAt: new Date() })
    mockRatingRepo.countByCase.mockResolvedValue(3)
    mockRatingRepo.avgByCase.mockResolvedValue(4.5)
    mockCaseRepo.update.mockResolvedValue(makeCase())

    const result = await useCase.execute({ ...validInput, score: 5 })

    expect(result.rating.score).toBe(5)
    expect(result.case.avgRating).toBe(4.5)
    expect(result.case.totalRatings).toBe(3)
    expect(mockCaseRepo.update).toHaveBeenCalledTimes(1)
  })

  it('throws validation error when score <= 3 without issues', async () => {
    mockCaseRepo.findById.mockResolvedValue(makeCase())
    mockSessionRepo.findCompletedByUserAndCase.mockResolvedValue(true)
    mockRatingRepo.findByUserAndCase.mockResolvedValue(null)
    await expect(useCase.execute({ ...validInput, score: 2 })).rejects.toThrow()
  })

  it('creates review queue item when avg < 3.0 and count >= 5', async () => {
    const clinicalCase = makeCase({ totalRatings: 4, avgRating: 4 })
    mockCaseRepo.findById.mockResolvedValue(clinicalCase)
    mockSessionRepo.findCompletedByUserAndCase.mockResolvedValue(true)
    mockRatingRepo.findByUserAndCase.mockResolvedValue(null)
    mockRatingRepo.create.mockResolvedValue({ id: 'r1', caseId: CASE_ID, score: 1, createdAt: new Date() })
    mockRatingRepo.countByCase.mockResolvedValue(5)
    mockRatingRepo.avgByCase.mockResolvedValue(2.5)
    mockCaseRepo.update.mockResolvedValue(clinicalCase)
    mockQueueRepo.findByCaseId.mockResolvedValue(null)
    mockQueueRepo.create.mockResolvedValue({ id: 'q1', caseId: CASE_ID, status: 'pending' })

    await useCase.execute({
      caseId: CASE_ID,
      userId: USER_ID,
      score: 1,
      issues: ['clinically_inaccurate'],
      comment: 'Informações clinicamente incorretas neste caso',
    })

    expect(mockQueueRepo.create).toHaveBeenCalledTimes(1)
    expect(mockCaseRepo.update).toHaveBeenCalledTimes(2)
  })

  it('does not create duplicate queue item when one already exists', async () => {
    const clinicalCase = makeCase()
    mockCaseRepo.findById.mockResolvedValue(clinicalCase)
    mockSessionRepo.findCompletedByUserAndCase.mockResolvedValue(true)
    mockRatingRepo.findByUserAndCase.mockResolvedValue(null)
    mockRatingRepo.create.mockResolvedValue({ id: 'r1', caseId: CASE_ID, score: 1, createdAt: new Date() })
    mockRatingRepo.countByCase.mockResolvedValue(5)
    mockRatingRepo.avgByCase.mockResolvedValue(2.0)
    mockCaseRepo.update.mockResolvedValue(clinicalCase)
    mockQueueRepo.findByCaseId.mockResolvedValue({ id: 'existing-queue', status: 'pending' })

    await useCase.execute({
      caseId: CASE_ID,
      userId: USER_ID,
      score: 1,
      issues: ['clinically_inaccurate'],
      comment: 'Informações clinicamente incorretas neste caso',
    })

    expect(mockQueueRepo.create).not.toHaveBeenCalled()
  })
})

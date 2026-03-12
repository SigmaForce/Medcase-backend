import { RegenerateQueueItem } from './RegenerateQueueItem'

jest.mock('src/config/env', () => ({ env: { NODE_ENV: 'test', OPENAI_API_KEY: 'test-key' } }))

const mockQueueRepo = { findById: jest.fn(), update: jest.fn() }
const mockCaseRepo = { findById: jest.fn(), update: jest.fn(), updateContent: jest.fn() }
const mockSpecialtyRepo = { findById: jest.fn() }
const mockCaseGeneratorService = { generate: jest.fn() }

const makeItem = (overrides = {}) => ({
  id: 'q1', caseId: 'case-1', status: 'pending', regenerations: 0,
  reviewedById: null, reviewedAt: null, createdAt: new Date(), updatedAt: new Date(),
  canRegenerate: function() { return this.regenerations < 2 },
  ...overrides,
})
const makeCase = () => ({
  id: 'case-1', specialtyId: 1, status: 'pending_review', difficulty: 'intermediate',
  language: 'pt', countryContext: 'BR', title: 'Test Case',
})
const makeSpecialty = () => ({ id: 1, namePt: 'Cardiologia', nameEs: 'Cardiología' })
const makeGenerated = () => ({
  title: 'New Title',
  case_brief: { diagnosis: 'IAM', expected_management: 'AAS' },
  opening_message: 'Olá!',
  patient_profile: { name: 'João' },
  available_exams: { laboratory: [], imaging: [], ecg: [], other: [] },
})

describe('RegenerateQueueItem', () => {
  let useCase: RegenerateQueueItem

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new RegenerateQueueItem(
      mockQueueRepo as never,
      mockCaseRepo as never,
      mockSpecialtyRepo as never,
      mockCaseGeneratorService as never,
    )
  })

  it('throws FORBIDDEN when role is student', async () => {
    await expect(useCase.execute({ itemId: 'q1', userId: 'u1', role: 'student' })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('throws QUEUE_ITEM_NOT_FOUND when item does not exist', async () => {
    mockQueueRepo.findById.mockResolvedValue(null)
    await expect(useCase.execute({ itemId: 'q1', userId: 'u1', role: 'reviewer' })).rejects.toMatchObject({ code: 'QUEUE_ITEM_NOT_FOUND' })
  })

  it('throws REGENERATION_LIMIT_REACHED when regenerations >= 2', async () => {
    mockQueueRepo.findById.mockResolvedValue(makeItem({ regenerations: 2 }))
    await expect(useCase.execute({ itemId: 'q1', userId: 'u1', role: 'reviewer' })).rejects.toMatchObject({
      code: 'REGENERATION_LIMIT_REACHED',
      statusCode: 409,
    })
  })

  it('regenerates case successfully', async () => {
    const item = makeItem()
    mockQueueRepo.findById.mockResolvedValue(item)
    mockQueueRepo.update.mockResolvedValue({ ...item, status: 'pending', regenerations: 1 })
    mockCaseRepo.findById.mockResolvedValue(makeCase())
    mockSpecialtyRepo.findById.mockResolvedValue(makeSpecialty())
    mockCaseGeneratorService.generate.mockResolvedValue(makeGenerated())
    mockCaseRepo.updateContent.mockResolvedValue(makeCase())

    const result = await useCase.execute({ itemId: 'q1', userId: 'u1', role: 'reviewer' })

    expect(result.queueItem.regenerations).toBe(1)
    expect(mockCaseRepo.updateContent).toHaveBeenCalledTimes(1)
  })

  it('resets item status to pending and throws GENERATION_FAILED when generator fails', async () => {
    const item = makeItem()
    mockQueueRepo.findById.mockResolvedValue(item)
    mockQueueRepo.update.mockResolvedValue(item)
    mockCaseRepo.findById.mockResolvedValue(makeCase())
    mockSpecialtyRepo.findById.mockResolvedValue(makeSpecialty())
    mockCaseGeneratorService.generate.mockRejectedValue(new Error('OpenAI timeout'))

    await expect(useCase.execute({ itemId: 'q1', userId: 'u1', role: 'reviewer' })).rejects.toMatchObject({
      code: 'GENERATION_FAILED',
      statusCode: 500,
    })
    expect(mockQueueRepo.update).toHaveBeenCalledTimes(2)
  })
})

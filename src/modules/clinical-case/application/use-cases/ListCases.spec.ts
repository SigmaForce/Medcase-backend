import { ListCases } from './ListCases'
import { ClinicalCase, CreateClinicalCaseProps } from '../../domain/entities/clinical-case.entity'

const makeCase = (overrides?: Partial<CreateClinicalCaseProps>) =>
  ClinicalCase.create({
    id: 'case-1',
    specialtyId: 1,
    createdById: 'user-1',
    title: 'Test case',
    difficulty: 'beginner',
    language: 'pt',
    countryContext: 'BR',
    status: 'approved',
    caseBrief: {},
    availableExams: {},
    avgRating: 3.5,
    ...overrides,
  })

const mockRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
}

describe('ListCases', () => {
  let useCase: ListCases

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new ListCases(mockRepo as any)
  })

  it('returns paginated result from repository', async () => {
    const cases = [makeCase()]
    mockRepo.findAll.mockResolvedValue({ data: cases, meta: { page: 1, limit: 20, total: 1 } })

    const result = await useCase.execute({ page: 1, limit: 20 })

    expect(result.data).toHaveLength(1)
    expect(result.meta.total).toBe(1)
    expect(mockRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
    )
  })

  it('passes filters to repository', async () => {
    mockRepo.findAll.mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0 } })

    await useCase.execute({
      page: 2,
      limit: 10,
      specialtyId: 3,
      difficulty: 'advanced',
      language: 'es',
      country: 'PY',
    })

    expect(mockRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        specialtyId: 3,
        difficulty: 'advanced',
        language: 'es',
        country: 'PY',
        page: 2,
        limit: 10,
      }),
    )
  })

  it('returns empty data when no cases match', async () => {
    mockRepo.findAll.mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0 } })

    const result = await useCase.execute({ page: 1, limit: 20 })

    expect(result.data).toHaveLength(0)
    expect(result.meta.total).toBe(0)
  })
})

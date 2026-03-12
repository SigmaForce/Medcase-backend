import { GetPerformanceBySpecialty } from './GetPerformanceBySpecialty'

const mockPerformanceRepo = { findAllByUser: jest.fn(), findByUserAndSpecialty: jest.fn() }

const makeRecord = (overrides = {}) => ({
  specialtyId: 1,
  totalSessions: 5,
  avgScoreTotal: 75,
  avgHistoryTaking: 70,
  avgDifferential: 65,
  avgDiagnosis: 80,
  avgExams: 60,
  avgManagement: 85,
  lastSessionAt: new Date(),
  ...overrides,
})

describe('GetPerformanceBySpecialty', () => {
  let useCase: GetPerformanceBySpecialty

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GetPerformanceBySpecialty(mockPerformanceRepo as never)
  })

  it('throws PERFORMANCE_NOT_FOUND when no record exists', async () => {
    mockPerformanceRepo.findByUserAndSpecialty.mockResolvedValue(null)
    await expect(useCase.execute({ userId: 'u1', specialtyId: 1 })).rejects.toMatchObject({
      code: 'PERFORMANCE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('returns performance detail with color bands per dimension', async () => {
    mockPerformanceRepo.findByUserAndSpecialty.mockResolvedValue(makeRecord())
    const result = await useCase.execute({ userId: 'u1', specialtyId: 1 })

    expect(result.specialtyId).toBe(1)
    expect(result.totalSessions).toBe(5)
    expect(result.colorBand).toBe('yellow')
    expect(result.dimensions.history_taking.avg).toBe(70)
    expect(result.dimensions.management.avg).toBe(85)
    expect(result.dimensions.management.colorBand).toBe('green')
    expect(result.dimensions.exams.colorBand).toBe('yellow')
  })
})

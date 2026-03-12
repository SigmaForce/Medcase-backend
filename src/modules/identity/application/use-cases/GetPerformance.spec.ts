import { GetPerformance } from './GetPerformance'

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

describe('GetPerformance', () => {
  let useCase: GetPerformance

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GetPerformance(mockPerformanceRepo as never)
  })

  it('returns empty results when no performance records', async () => {
    mockPerformanceRepo.findAllByUser.mockResolvedValue([])
    const result = await useCase.execute({ userId: 'u1' })
    expect(result.bySpecialty).toHaveLength(0)
    expect(result.overall.totalSessions).toBe(0)
    expect(result.overall.avgScoreTotal).toBe(0)
  })

  it('assigns green color_band when avgScore >= 80', async () => {
    mockPerformanceRepo.findAllByUser.mockResolvedValue([makeRecord({ avgScoreTotal: 85 })])
    const result = await useCase.execute({ userId: 'u1' })
    expect(result.bySpecialty[0].colorBand).toBe('green')
  })

  it('assigns yellow color_band when 60 <= avgScore < 80', async () => {
    mockPerformanceRepo.findAllByUser.mockResolvedValue([makeRecord({ avgScoreTotal: 70 })])
    const result = await useCase.execute({ userId: 'u1' })
    expect(result.bySpecialty[0].colorBand).toBe('yellow')
  })

  it('assigns red color_band when avgScore < 60', async () => {
    mockPerformanceRepo.findAllByUser.mockResolvedValue([makeRecord({ avgScoreTotal: 45 })])
    const result = await useCase.execute({ userId: 'u1' })
    expect(result.bySpecialty[0].colorBand).toBe('red')
  })

  it('computes weakest and strongest dimensions correctly', async () => {
    mockPerformanceRepo.findAllByUser.mockResolvedValue([makeRecord({
      avgHistoryTaking: 70, avgDifferential: 65, avgDiagnosis: 80, avgExams: 50, avgManagement: 85,
    })])
    const result = await useCase.execute({ userId: 'u1' })
    expect(result.overall.weakestDimension).toBe('exams')
    expect(result.overall.strongestDimension).toBe('management')
  })
})

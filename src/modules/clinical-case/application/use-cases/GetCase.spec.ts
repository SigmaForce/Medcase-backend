import { GetCase } from './GetCase'
import { ClinicalCase } from '../../domain/entities/clinical-case.entity'
import { DomainException } from '../../../../errors/domain-exception'

const makeCase = (status: ClinicalCase['status'] = 'approved') =>
  ClinicalCase.create({
    id: 'case-1',
    specialtyId: 1,
    createdById: 'user-1',
    title: 'Test case',
    difficulty: 'beginner',
    language: 'pt',
    countryContext: 'BR',
    status,
    caseBrief: {},
    availableExams: {},
  })

const mockRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
}

describe('GetCase', () => {
  let useCase: GetCase

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GetCase(mockRepo as any)
  })

  it('returns an approved case', async () => {
    mockRepo.findById.mockResolvedValue(makeCase('approved'))

    const result = await useCase.execute({ id: 'case-1' })

    expect(result.id).toBe('case-1')
    expect(result.status).toBe('approved')
  })

  it('throws CASE_NOT_FOUND when case does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute({ id: 'nonexistent' })).rejects.toMatchObject({
      code: 'CASE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws CASE_NOT_AVAILABLE when status is not approved', async () => {
    mockRepo.findById.mockResolvedValue(makeCase('pending_review'))

    await expect(useCase.execute({ id: 'case-1' })).rejects.toMatchObject({
      code: 'CASE_NOT_AVAILABLE',
      statusCode: 403,
    })
  })

  it.each(['draft', 'rejected', 'regenerating'] as const)(
    'throws CASE_NOT_AVAILABLE for status %s',
    async (status) => {
      mockRepo.findById.mockResolvedValue(makeCase(status))
      await expect(useCase.execute({ id: 'case-1' })).rejects.toMatchObject({
        code: 'CASE_NOT_AVAILABLE',
        statusCode: 403,
      })
    },
  )
})

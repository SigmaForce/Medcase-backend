import { GetMyRating } from './GetMyRating'

const mockRatingRepo = { findByUserAndCase: jest.fn() }

describe('GetMyRating', () => {
  let useCase: GetMyRating

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new GetMyRating(mockRatingRepo as never)
  })

  it('throws RATING_NOT_FOUND when rating does not exist', async () => {
    mockRatingRepo.findByUserAndCase.mockResolvedValue(null)
    await expect(useCase.execute({ caseId: 'c1', userId: 'u1' })).rejects.toMatchObject({
      code: 'RATING_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('returns rating when it exists', async () => {
    const rating = { score: 4, comment: 'Bom caso', issues: ['other'], createdAt: new Date() }
    mockRatingRepo.findByUserAndCase.mockResolvedValue(rating)

    const result = await useCase.execute({ caseId: 'c1', userId: 'u1' })

    expect(result.rated).toBe(true)
    expect(result.rating.score).toBe(4)
    expect(result.rating.comment).toBe('Bom caso')
  })
})

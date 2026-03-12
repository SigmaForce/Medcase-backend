import { CaseRating } from './case-rating.entity'

describe('CaseRating', () => {
  it('creates with default values', () => {
    const rating = CaseRating.create({ caseId: 'case-1', userId: 'user-1', score: 4 })
    expect(rating.caseId).toBe('case-1')
    expect(rating.userId).toBe('user-1')
    expect(rating.score).toBe(4)
    expect(rating.issues).toEqual([])
    expect(rating.comment).toBeNull()
    expect(rating.id).toBe('')
    expect(rating.createdAt).toBeInstanceOf(Date)
  })

  it('creates with all fields', () => {
    const now = new Date()
    const rating = CaseRating.create({
      id: 'rating-uuid',
      caseId: 'case-1',
      userId: 'user-1',
      score: 2,
      issues: ['confusing', 'outdated'],
      comment: 'Caso com informações desatualizadas',
      createdAt: now,
    })
    expect(rating.id).toBe('rating-uuid')
    expect(rating.score).toBe(2)
    expect(rating.issues).toEqual(['confusing', 'outdated'])
    expect(rating.comment).toBe('Caso com informações desatualizadas')
    expect(rating.createdAt).toBe(now)
  })
})

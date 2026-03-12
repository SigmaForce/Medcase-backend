import { ReviewQueueItem } from './review-queue-item.entity'

describe('ReviewQueueItem', () => {
  it('creates with default values', () => {
    const item = ReviewQueueItem.create({ caseId: 'case-1' })
    expect(item.caseId).toBe('case-1')
    expect(item.status).toBe('pending')
    expect(item.regenerations).toBe(0)
    expect(item.reviewedById).toBeNull()
    expect(item.reviewedAt).toBeNull()
    expect(item.id).toBe('')
    expect(item.createdAt).toBeInstanceOf(Date)
  })

  it('canRegenerate returns true when regenerations < 2', () => {
    const item = ReviewQueueItem.create({ caseId: 'case-1', regenerations: 1 })
    expect(item.canRegenerate()).toBe(true)
  })

  it('canRegenerate returns false when regenerations >= 2', () => {
    const item = ReviewQueueItem.create({ caseId: 'case-1', regenerations: 2 })
    expect(item.canRegenerate()).toBe(false)
  })

  it('creates with all fields', () => {
    const now = new Date()
    const item = ReviewQueueItem.create({
      id: 'queue-uuid',
      caseId: 'case-1',
      status: 'approved',
      regenerations: 1,
      reviewedById: 'reviewer-1',
      reviewedAt: now,
    })
    expect(item.id).toBe('queue-uuid')
    expect(item.status).toBe('approved')
    expect(item.regenerations).toBe(1)
    expect(item.reviewedById).toBe('reviewer-1')
    expect(item.reviewedAt).toBe(now)
  })
})

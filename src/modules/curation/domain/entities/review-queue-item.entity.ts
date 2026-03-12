export type ReviewQueueStatus = 'pending' | 'approved' | 'rejected' | 'regenerating'

export interface CreateReviewQueueItemProps {
  id?: string
  caseId: string
  status?: ReviewQueueStatus
  regenerations?: number
  reviewedById?: string | null
  reviewedAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

export class ReviewQueueItem {
  id: string
  caseId: string
  status: ReviewQueueStatus
  regenerations: number
  reviewedById: string | null
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date

  static create(props: CreateReviewQueueItemProps): ReviewQueueItem {
    const item = new ReviewQueueItem()
    item.id = props.id ?? ''
    item.caseId = props.caseId
    item.status = props.status ?? 'pending'
    item.regenerations = props.regenerations ?? 0
    item.reviewedById = props.reviewedById ?? null
    item.reviewedAt = props.reviewedAt ?? null
    item.createdAt = props.createdAt ?? new Date()
    item.updatedAt = props.updatedAt ?? new Date()
    return item
  }

  canRegenerate(): boolean {
    return this.regenerations < 2
  }
}
